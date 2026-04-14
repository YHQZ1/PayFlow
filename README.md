<div align="center">

# PayFlow

**A production-grade payment gateway, built from scratch.**

PayFlow is a multi-tenant payment processing platform built as a portfolio project — architected the way a real payment processor would be, not as a wrapper around Stripe or Razorpay. Businesses integrate PayFlow the way they would integrate any payment gateway: register a tenant, get an API key, start processing payments.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify&logoColor=white)](https://fastify.dev)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-KRaft-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)

</div>

---

## Table of Contents

- [What PayFlow is](#what-payflow-is)
- [Architecture overview](#architecture-overview)
- [Services](#services)
- [Key engineering patterns](#key-engineering-patterns)
- [API reference](#api-reference)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Kafka topics and event schema](#kafka-topics-and-event-schema)
- [Development roadmap](#development-roadmap)

---

## What PayFlow is

PayFlow is a **payment processor** — not a payments wrapper. There are no calls to Stripe, Razorpay, or any external provider. PayFlow owns the full payment lifecycle:

- Tenant registration and API key management
- Payment intake, processing (simulated), and status tracking
- Refund processing
- Double-entry bookkeeping via a dedicated ledger service
- Real-time fraud scoring via rule-based analysis
- Webhook delivery to tenant-registered endpoints

The system is multi-tenant: multiple businesses can register and use PayFlow simultaneously, each with full data isolation. Every payment is scoped to a `tenant_id` derived from the authenticated API key — never from the request body.

### For business owners

If you're evaluating PayFlow as a payment solution, here's what you get:

**Simple integration.** Register your business, receive an API key, and start accepting payments with a single API call. No complex SDK setup required — just standard HTTP requests.

**Per-payment reliability.** Every payment request requires an idempotency key, which means duplicate charges are impossible. If a request times out and your server retries it, you will not be charged twice.

**Real-time webhooks.** Register a URL and receive instant notifications when payments succeed, fail, are flagged for fraud, or are refunded. If your server is temporarily unavailable, PayFlow retries delivery automatically.

**Built-in fraud protection.** Every payment is automatically scored for fraud signals: unusual velocity (too many payments in a short window), abnormally large amounts, and repeat failure patterns. Flagged payments are blocked before settlement.

**Full transaction history.** Query your complete transaction ledger at any time, with your current balance and paginated history of every debit and credit.

---

## Architecture overview

```
                        ┌─────────────────────────────────────────────┐
                        │               External Clients               │
                        └────────────────────┬────────────────────────┘
                                             │ HTTPS
                                    ┌────────▼────────┐
                                    │      NGINX       │  (Phase 3+)
                                    │  API Gateway     │
                                    └──┬───────┬───┬──┘
                                       │       │   │
                   ┌───────────────────┘       │   └─────────────────┐
                   ▼                           ▼                      ▼
        ┌──────────────────┐       ┌───────────────────┐  ┌──────────────────┐
        │  tenant-service  │       │  payment-service  │  │  ledger-service  │
        │     :3003        │◄──────│      :3000        │  │     :3001        │
        │                  │       │                   │  │  (read-only API) │
        └──────────────────┘       └────────┬──────────┘  └────────▲─────────┘
                 ▲                          │ Kafka events           │
                 │ REST (webhook lookup)    │                        │
        ┌────────┴─────────┐               │    ┌───────────────────┘
        │notification-serv │               │    │         payment.created
        │     :3002        │◄──────────────┤    │         refund.initiated
        └──────────────────┘               │    │
                                           │    │  ┌──────────────────┐
                                           ├────┼─►│  fraud-service   │
                                           │    │  │     :3004        │
                                           │    │  └────────┬─────────┘
                                           │    │           │ fraud.flagged
                                           │    │           ▼
                                           │    │  ┌──────────────────┐
                                           │    │  │  payment-service │
                                           │    │  │  (Kafka consumer)│
                                           │    │  └──────────────────┘
```

**Communication patterns:**

| From                 | To                                              | Protocol  | Purpose                                     |
| -------------------- | ----------------------------------------------- | --------- | ------------------------------------------- |
| External clients     | payment-service, tenant-service, ledger-service | REST/HTTP | Public API                                  |
| payment-service      | tenant-service                                  | REST      | API key validation on every inbound request |
| notification-service | tenant-service                                  | REST      | Webhook URL lookup per tenant               |
| payment-service      | Kafka                                           | Event     | Emit after every state-changing operation   |
| fraud-service        | Kafka                                           | Event     | Emit `fraud.flagged` when rules trigger     |
| ledger-service       | Kafka                                           | Consumer  | Book every payment and refund               |
| notification-service | Kafka                                           | Consumer  | Deliver webhooks on every event             |
| fraud-service        | Kafka                                           | Consumer  | Score every new payment                     |

---

## Services

### tenant-service `:3003`

The identity authority for the entire system. Every other service ultimately traces authentication back to tenant-service.

**Responsibilities:**

- Tenant registration and profile management
- API key generation (cryptographically random, hashed before storage)
- Webhook endpoint registration per tenant
- Internal API key validation endpoint (called by payment-service on every request)
- Internal webhook URL lookup endpoint (called by notification-service)

**Internal endpoints** (`/internal/*`) are not exposed to external traffic. In Phase 1 they are protected by a shared `x-internal-token` header. In Phase 3, NGINX blocks these routes at the gateway level.

---

### payment-service `:3000`

The core domain. This is where payments are created, processed, and tracked.

**Responsibilities:**

- Accept incoming payment requests, validate API key via tenant-service
- Check idempotency (Redis) before processing — return cached result if key exists
- Run the mock processor: deterministic 90% success / 10% failure with realistic error codes
- Write payment record to database (outbox pattern: DB write before Kafka emit)
- Emit `payment.created` and `payment.settled` events to Kafka
- Handle refund requests and emit `refund.initiated`
- Listen for `fraud.flagged` events and update payment status accordingly
- Expose read APIs for payment status and paginated history

**Mock processor error codes (on failure):**
`insufficient_funds`, `card_declined`, `do_not_honor`, `expired_card`, `invalid_cvv`

---

### ledger-service `:3001`

The financial record of truth. Implements double-entry bookkeeping — every payment creates two balanced journal entries.

**Responsibilities:**

- Consume `payment.created` and `refund.initiated` events
- Write a DEBIT entry (tenant's receivable) and CREDIT entry (PayFlow's liability) for every event
- Ensure the sum of all journal entries for any payment is always zero
- Expose read APIs: current tenant balance, paginated transaction history
- Run a nightly reconciliation job that checks for orphaned payments, unmatched entries, and any debit/credit imbalance

**Double-entry example:**

```
Payment of ₹500 (50000 paise) by Tenant A:
  DEBIT  | tenant_receivable | tenant_a | +50000
  CREDIT | payflow_liability | tenant_a | -50000
  ─────────────────────────────────────────────
  Net:                                       0   ✓
```

---

### notification-service `:3002`

Delivers webhooks to tenant-registered URLs for every significant payment event.

**Responsibilities:**

- Consume all payment-related Kafka events
- Look up the tenant's webhook URL from tenant-service (REST call)
- POST the event payload to the tenant's URL
- Retry with exponential backoff on failure (attempts at T+0s, T+30s, T+5min)
- Log every delivery attempt with status code and duration

---

### fraud-service `:3004`

Real-time rule-based fraud scoring on every new payment. No ML — deterministic rules that can be reasoned about and audited.

**Rules applied:**

- **Velocity check**: More than N payments from the same tenant in X seconds (configurable, tracked in Redis with a sliding window)
- **Amount threshold**: Single payment exceeds the configured maximum (default: ₹5000 / 500000 paise)
- **Repeat failure pattern**: Same tenant has had 3+ failed payments in the last 10 minutes

If any rule triggers, a `fraud.flagged` event is emitted to Kafka with the rule that fired and a risk score. payment-service listens for this and blocks or flags the payment.

---

## Key engineering patterns

### Idempotency

All `POST /payments` requests require an `Idempotency-Key` header. The key is stored in Redis with the payment result for 24 hours.

```
Redis key format: idempotency:{tenant_id}:{idempotency_key}
TTL: 86400 seconds (24 hours)
```

If the same key is seen within the TTL window, the stored result is returned immediately — no database write, no Kafka event, no double charge.

### Outbox pattern

Kafka events are emitted **after** the database write is committed — never before. This means:

1. Payment is written to PostgreSQL with status `processing`
2. Transaction commits successfully
3. Kafka event is emitted

If step 3 fails (Kafka is temporarily unavailable), the payment exists in the database and can be reconciled. The inverse — a Kafka event for a payment that never made it to the database — is impossible. Phase 2 will add a proper outbox table for guaranteed delivery.

### Double-entry bookkeeping

Every financial event creates exactly two ledger rows that sum to zero. The ledger can never be in an inconsistent state where debits don't match credits — this is enforced at the application layer and verified by the nightly reconciliation cron.

### Internal service authentication

Service-to-service calls on `/internal/*` routes require an `x-internal-token` header containing a shared secret (`INTERNAL_SERVICE_SECRET`). This secret is identical across all services and is injected via environment variable. Requests missing or presenting an incorrect token receive a `401` response.

### Amounts in paise

All monetary values in PayFlow are stored and transmitted as integers in the smallest currency unit (paise for INR). There are no floating-point amounts anywhere in the system. `50000` means ₹500.00.

### Cursor-based pagination

All list endpoints use cursor-based pagination rather than offset/limit. This is correct for high-volume payment data — offset pagination degrades as the dataset grows and can return duplicate or skipped records under concurrent writes. Cursor pagination is stable and efficient at any scale.

---

## API reference

### Authentication

All requests to payment-service and ledger-service must include an API key:

```
x-api-key: pfk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### tenant-service

#### Register a tenant

```http
POST /tenants/register
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "payments@acme.com"
}
```

```json
{
  "tenant_id": "ten_01hx...",
  "name": "Acme Corp",
  "api_key": "pfk_live_...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Register a webhook URL

```http
PUT /tenants/:id/webhook
x-api-key: pfk_live_...
Content-Type: application/json

{
  "url": "https://your-server.com/webhooks/payflow"
}
```

---

### payment-service

#### Create a payment

```http
POST /payments
x-api-key: pfk_live_...
Idempotency-Key: order_12345_attempt_1
Content-Type: application/json

{
  "amount": 50000,
  "currency": "INR",
  "description": "Order #12345",
  "metadata": {
    "order_id": "12345",
    "customer_email": "customer@example.com"
  }
}
```

```json
{
  "payment_id": "pay_01hx...",
  "amount": 50000,
  "currency": "INR",
  "status": "succeeded",
  "description": "Order #12345",
  "metadata": { "order_id": "12345" },
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Payment statuses:** `processing` → `succeeded` | `failed` | `flagged`

**Possible error codes on failure:**

```json
{
  "payment_id": "pay_01hx...",
  "status": "failed",
  "error": {
    "code": "insufficient_funds",
    "message": "The card has insufficient funds to complete this transaction."
  }
}
```

#### Get a payment

```http
GET /payments/:id
x-api-key: pfk_live_...
```

#### List payments

```http
GET /payments?limit=20&cursor=pay_01hw...
x-api-key: pfk_live_...
```

```json
{
  "data": [...],
  "next_cursor": "pay_01hv...",
  "has_more": true
}
```

#### Create a refund

```http
POST /payments/:id/refunds
x-api-key: pfk_live_...
Idempotency-Key: refund_order_12345
Content-Type: application/json

{
  "reason": "Customer requested refund"
}
```

---

### ledger-service

#### Get tenant balance

```http
GET /ledger/balance
x-api-key: pfk_live_...
```

```json
{
  "tenant_id": "ten_01hx...",
  "balance_paise": 1250000,
  "balance_display": "₹12,500.00",
  "as_of": "2024-01-01T00:00:00Z"
}
```

#### Get transaction history

```http
GET /ledger/transactions?limit=20&cursor=jrn_01hw...
x-api-key: pfk_live_...
```

---

### Webhook payloads

PayFlow POSTs to your registered URL for the following events. All payloads include an `event` field identifying the event type.

#### `payment.created`

```json
{
  "event": "payment.created",
  "payment_id": "pay_01hx...",
  "tenant_id": "ten_01hx...",
  "amount": 50000,
  "currency": "INR",
  "status": "processing",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### `payment.settled`

```json
{
  "event": "payment.settled",
  "payment_id": "pay_01hx...",
  "status": "succeeded",
  "settled_at": "2024-01-01T00:00:00Z"
}
```

#### `fraud.flagged`

```json
{
  "event": "fraud.flagged",
  "payment_id": "pay_01hx...",
  "rule_triggered": "velocity_check",
  "risk_score": 85,
  "flagged_at": "2024-01-01T00:00:00Z"
}
```

#### `refund.initiated`

```json
{
  "event": "refund.initiated",
  "payment_id": "pay_01hx...",
  "refund_id": "ref_01hx...",
  "amount": 50000,
  "reason": "Customer requested refund"
}
```

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm 10+

### 1. Clone and install

```bash
git clone https://github.com/your-username/payflow.git
cd payflow
npm install
```

### 2. Set up environment variables

Each service has a `.env.example`. Copy it to `.env` for each service:

```bash
for svc in tenant-service payment-service ledger-service notification-service fraud-service; do
  cp services/$svc/.env.example services/$svc/.env
done
```

Generate a secure internal secret and update it in all five `.env` files:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Replace `change-me-to-a-long-random-string` with this value in all `.env` files. **All services must share the same value.**

### 3. Start infrastructure

```bash
npm run infra:up
```

This starts PostgreSQL (with all 5 databases), Redis, Kafka (KRaft), and Kafka UI.

Verify everything is healthy:

```bash
docker compose ps
```

All containers should show `healthy`. Kafka takes ~30 seconds to become ready.

### 4. Run database migrations

```bash
npm run migrate --workspace=services/tenant-service
npm run migrate --workspace=services/payment-service
npm run migrate --workspace=services/ledger-service
npm run migrate --workspace=services/notification-service
npm run migrate --workspace=services/fraud-service
```

### 5. Start services

Open five terminal tabs (or use a process manager):

```bash
npm run dev:tenant        # :3003
npm run dev:payment       # :3000
npm run dev:ledger        # :3001
npm run dev:notification  # :3002
npm run dev:fraud         # :3004
```

### 6. Verify the full flow

**Register a tenant:**

```bash
curl -X POST http://localhost:3003/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Corp", "email": "test@example.com"}'
```

**Register a webhook** (use https://webhook.site for a free test receiver):

```bash
curl -X PUT http://localhost:3003/tenants/{tenant_id}/webhook \
  -H "x-api-key: {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://webhook.site/your-unique-url"}'
```

**Create a payment:**

```bash
curl -X POST http://localhost:3000/payments \
  -H "x-api-key: {your_api_key}" \
  -H "Idempotency-Key: test-payment-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "currency": "INR", "description": "Test payment"}'
```

**Observe Kafka events:**  
Open http://localhost:8080 (Kafka UI). You should see `payment.created` and `payment.settled` events in their respective topics.

**Check ledger:**

```bash
curl http://localhost:3001/ledger/transactions \
  -H "x-api-key: {your_api_key}"
```

**Test idempotency** — repeat the same payment request with the same `Idempotency-Key`. You should receive the same `payment_id` and see zero new Kafka events.

---

## Project structure

```
payflow/
├── docker-compose.yml           # Infra: Postgres, Redis, Kafka, Kafka UI
├── infra/
│   └── postgres/
│       └── init.sql             # Creates all 5 databases on first run
├── packages/
│   ├── shared/                  # Shared TypeScript types, constants, utilities
│   ├── kafka/                   # KafkaJS client wrappers (producer, consumer)
│   └── logger/                  # Structured JSON logger (pino)
└── services/
    ├── tenant-service/          # :3003 — identity, API keys, webhooks
    │   └── src/
    │       ├── routes/
    │       │   ├── tenants.ts   # POST /tenants/register, PUT /tenants/:id/webhook
    │       │   └── internal.ts  # GET /internal/api-keys/:key, /internal/tenants/:id/webhook
    │       ├── db/
    │       │   ├── schema.ts    # Drizzle schema: tenants, api_keys, webhooks
    │       │   └── client.ts    # Drizzle + pg client
    │       ├── middleware/
    │       │   └── internalAuth.ts  # x-internal-token validation
    │       └── lib/
    │           └── apiKeys.ts   # Key generation, hashing, validation logic
    ├── payment-service/         # :3000 — payment lifecycle, idempotency, refunds
    │   └── src/
    │       ├── routes/
    │       │   ├── payments.ts  # POST /payments, GET /payments, GET /payments/:id
    │       │   └── refunds.ts   # POST /payments/:id/refunds
    │       ├── middleware/
    │       │   └── apiKeyAuth.ts    # Calls tenant-service to validate x-api-key
    │       ├── lib/
    │       │   ├── mockProcessor.ts # 90/10 success/fail, realistic error codes
    │       │   └── idempotency.ts   # Redis-backed idempotency key check/store
    │       └── kafka/
    │           ├── producer.ts  # Emits payment.created, payment.settled, refund.initiated
    │           └── consumer.ts  # Listens for fraud.flagged
    ├── ledger-service/          # :3001 — double-entry bookkeeping
    │   └── src/
    │       ├── routes/
    │       │   └── ledger.ts    # GET /ledger/balance, GET /ledger/transactions
    │       ├── kafka/
    │       │   └── consumer.ts  # payment.created, refund.initiated
    │       └── lib/
    │           ├── doubleEntry.ts      # Writes DEBIT + CREDIT journal pairs
    │           └── reconciliation.ts   # Nightly cron: checks for imbalances
    ├── notification-service/    # :3002 — webhook delivery
    │   └── src/
    │       ├── kafka/
    │       │   └── consumer.ts  # All payment events
    │       └── lib/
    │           ├── dispatcher.ts  # HTTP POST to tenant webhook URL
    │           └── retry.ts       # Exponential backoff retry logic
    └── fraud-service/           # :3004 — rule-based fraud scoring
        └── src/
            ├── kafka/
            │   ├── consumer.ts  # payment.created
            │   └── producer.ts  # fraud.flagged
            └── lib/
                ├── rules.ts     # Velocity, amount threshold, repeat failure rules
                └── scorer.ts    # Orchestrates rules, computes risk score
```

---

## Environment variables

### Shared (all services)

| Variable                  | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| `INTERNAL_SERVICE_SECRET` | Shared secret for service-to-service auth. Must be identical across all services. |
| `KAFKA_BROKERS`           | Comma-separated Kafka broker addresses. Default: `localhost:9092`                 |
| `REDIS_URL`               | Redis connection URL. Default: `redis://localhost:6379`                           |

### Per-service

| Service              | Variable                  | Description                                              |
| -------------------- | ------------------------- | -------------------------------------------------------- |
| All                  | `PORT`                    | HTTP port the service listens on                         |
| All                  | `DATABASE_URL`            | PostgreSQL connection string for this service's database |
| payment-service      | `TENANT_SERVICE_URL`      | Base URL for tenant-service internal calls               |
| notification-service | `TENANT_SERVICE_URL`      | Base URL for tenant-service webhook URL lookups          |
| fraud-service        | `VELOCITY_WINDOW_SECONDS` | Sliding window for velocity rule (default: `60`)         |
| fraud-service        | `VELOCITY_MAX_PAYMENTS`   | Max payments in window before flagging (default: `10`)   |
| fraud-service        | `AMOUNT_THRESHOLD_PAISE`  | Max single payment amount (default: `500000` = ₹5000)    |

---

## Kafka topics and event schema

| Topic              | Producer        | Consumers                                           | Trigger                         |
| ------------------ | --------------- | --------------------------------------------------- | ------------------------------- |
| `payment.created`  | payment-service | ledger-service, fraud-service, notification-service | New payment recorded in DB      |
| `payment.settled`  | payment-service | notification-service                                | Payment reaches terminal status |
| `refund.initiated` | payment-service | ledger-service, notification-service                | Refund created                  |
| `fraud.flagged`    | fraud-service   | payment-service                                     | A fraud rule triggered          |

All events include `tenant_id`, `payment_id`, `timestamp`, and event-specific fields. See [Webhook payloads](#webhook-payloads) for the full schema of each event.

---

## Development roadmap

| Phase       | Focus                                                               | Status         |
| ----------- | ------------------------------------------------------------------- | -------------- |
| **Phase 1** | Core services working e2e, Docker Compose infra                     | 🔄 In progress |
| **Phase 2** | Error handling, saga pattern, integration tests, structured logging | ⏳ Planned     |
| **Phase 3** | Dockerize services, Kubernetes (Minikube/k3d), NGINX ingress        | ⏳ Planned     |
| **Phase 4** | AWS with Terraform (EKS, RDS, MSK, ElastiCache)                     | ⏳ Planned     |
| **Phase 5** | CI/CD and GitOps (GitHub Actions + ArgoCD)                          | ⏳ Planned     |
| **Phase 6** | Observability (Prometheus, Grafana, Loki)                           | ⏳ Planned     |
| **Phase 7** | Developer Portal (Next.js + Tailwind v4)                            | ⏳ Planned     |

---

## Tech stack

| Layer               | Technology                        |
| ------------------- | --------------------------------- |
| Runtime             | Node.js 20+                       |
| Language            | TypeScript 5.4                    |
| HTTP framework      | Fastify 4                         |
| ORM                 | Drizzle ORM                       |
| Database            | PostgreSQL 16                     |
| Message broker      | Apache Kafka (KRaft, via KafkaJS) |
| Cache / Idempotency | Redis 7                           |
| Monorepo            | npm workspaces                    |
| Local infra         | Docker Compose                    |
| API Gateway         | NGINX (Phase 3+)                  |

---

<div align="center">

Built as a portfolio project demonstrating production payment gateway architecture.

</div>
