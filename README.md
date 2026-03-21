# PayFlow 💳

> A production-grade, multi-tenant payment processing platform built with Node.js microservices, Kafka event streaming, Kubernetes on AWS, and a full developer portal — inspired by Stripe's architecture.

---

## Table of Contents

1. [What is PayFlow?](#what-is-payflow)
2. [Why This Project?](#why-this-project)
3. [System Overview](#system-overview)
4. [Microservices](#microservices)
5. [Event Architecture (Kafka)](#event-architecture-kafka)
6. [Data Storage Strategy](#data-storage-strategy)
7. [Developer Portal](#developer-portal)
8. [Infrastructure (AWS + Terraform)](#infrastructure-aws--terraform)
9. [Kubernetes Setup](#kubernetes-setup)
10. [CI/CD and GitOps](#cicd-and-gitops)
11. [Observability Stack](#observability-stack)
12. [Security Design](#security-design)
13. [Local Development](#local-development)
14. [Project Phases](#project-phases)
15. [Folder Structure](#folder-structure)
16. [Key Engineering Decisions](#key-engineering-decisions)
17. [Interview Talking Points](#interview-talking-points)

---

## What is PayFlow?

PayFlow is a **multi-tenant payment processing platform** — think Stripe, but built entirely by you from first principles.

Businesses (tenants) sign up for PayFlow and receive API keys. They then use the PayFlow REST API to:

- Charge customers
- Issue refunds
- Receive real-time webhooks on payment events
- View transaction analytics and settlement reports via a developer dashboard

Under the hood, PayFlow is a distributed system of independent Node.js microservices, each with a single responsibility, communicating asynchronously over a Kafka event bus, deployed on Kubernetes on AWS, with full observability and GitOps-based deployments.

---

## Why This Project?

Most portfolio projects demonstrate one skill. PayFlow demonstrates the full stack of what a senior backend or platform engineer is expected to know:

| Skill Area | What You Build |
|---|---|
| Microservices | 5 independent Node.js services with clear domain boundaries |
| Event-driven architecture | Kafka topics, consumers, producers, dead-letter queues |
| Fintech patterns | Idempotency, double-entry ledger, saga pattern, reconciliation |
| Infrastructure as Code | Terraform modules for VPC, EKS, RDS, MSK, ElastiCache, S3 |
| Container orchestration | Kubernetes deployments, services, ingress, HPA, config maps |
| CI/CD & GitOps | GitHub Actions pipelines + ArgoCD for declarative deployments |
| Observability | Prometheus metrics, Grafana dashboards, Loki log aggregation |
| Platform engineering | Multi-tenant developer portal with API docs, keys, and analytics |
| Security | JWT auth, API key hashing, TLS, secrets management, RBAC |

---

## System Overview

```
Client (Tenant App)
        │
        ▼
┌───────────────────┐
│   API Gateway      │  ← Kong / NGINX: auth, rate limiting, routing
└────────┬──────────┘
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
    ▼                                       ▼
┌──────────────┐   ┌───────────┐   ┌───────────────┐   ┌─────────────┐
│ Payment Svc  │   │ Ledger Svc│   │Notification Svc│   │  Tenant Svc │
│ (Node.js)    │   │ (Node.js) │   │   (Node.js)    │   │  (Node.js)  │
└──────┬───────┘   └─────┬─────┘   └───────┬────────┘   └──────┬──────┘
       │                 │                  │                    │
       └─────────────────┴──────────────────┴────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Kafka Bus         │
                         │  payment.created       │
                         │  ledger.updated        │
                         │  webhook.dispatch      │
                         │  fraud.flagged         │
                         └──────┬───────┬─────────┘
                                │       │
                    ┌───────────┘       └──────────────┐
                    ▼                                   ▼
         ┌──────────────────┐              ┌──────────────────────┐
         │  Fraud Detection │              │  Webhook Dispatcher  │
         │  (Consumer)      │              │  (Consumer + Retry)  │
         └──────────────────┘              └──────────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Reconciliation  │
         │  (Nightly batch) │
         └──────────────────┘
```

---

## Microservices

### 1. Payment Service (`/services/payment-service`)

The core of the system. Handles all payment lifecycle operations.

**Responsibilities:**
- Accept payment requests from tenants via REST API
- Enforce idempotency using a Redis-backed key store (prevent duplicate charges on retried requests)
- Execute the payment saga: validate → charge → emit event → respond
- Issue refunds with partial refund support
- Expose payment status polling endpoint

**Key Engineering Problem — Idempotency:**
If a tenant's server sends `POST /payments` and the network drops before receiving a response, they'll retry. Without idempotency, the customer gets charged twice. PayFlow solves this by requiring an `Idempotency-Key` header. This key is stored in Redis with a TTL of 24 hours. If the same key is seen again, the cached response is returned instead of processing a new charge.

**API Endpoints:**
```
POST   /v1/payments              ← Create payment
GET    /v1/payments/:id          ← Get payment status
POST   /v1/payments/:id/refund   ← Initiate refund
GET    /v1/payments              ← List payments (paginated)
```

**Tech:** Node.js, Express, PostgreSQL (via Prisma), Redis, Kafka producer

---

### 2. Ledger Service (`/services/ledger-service`)

Implements double-entry accounting. Every financial event in the system has a corresponding ledger entry.

**Responsibilities:**
- Listen to `payment.created`, `payment.refunded` Kafka events
- Write double-entry journal entries (debit + credit always balance)
- Maintain per-tenant running balances
- Expose balance query and transaction history endpoints

**Key Engineering Problem — Double-Entry Accounting:**
In traditional systems, a payment just adds a row to a `payments` table. In a real financial system, every transaction must be expressed as a pair of entries: a debit to one account and a credit to another. This ensures the books always balance and allows you to reconstruct the state of any account at any point in time.

```
payment.created event received:
  → DEBIT  accounts_receivable  ₹500
  → CREDIT revenue              ₹500
```

**Tech:** Node.js, Express, PostgreSQL, Kafka consumer

---

### 3. Notification Service (`/services/notification-service`)

Handles outbound communications — webhooks, emails, and SMS.

**Responsibilities:**
- Consume `payment.created`, `payment.failed`, `refund.issued` events
- Deliver webhooks to tenant-registered URLs with retry logic (exponential backoff)
- Send email receipts via SendGrid
- Maintain webhook delivery log per tenant

**Key Engineering Problem — Webhook Reliability:**
Webhooks must be delivered at least once. If the tenant's server is down, PayFlow retries with exponential backoff (1s, 2s, 4s, 8s… up to 24 hours). Each attempt is logged. Failed webhooks after max retries go to a dead-letter queue in Kafka and alert the platform team.

**Webhook Payload:**
```json
{
  "id": "evt_01J9XZ...",
  "type": "payment.succeeded",
  "tenant_id": "ten_abc123",
  "created_at": "2025-03-22T10:30:00Z",
  "data": {
    "payment_id": "pay_01J9...",
    "amount": 50000,
    "currency": "INR",
    "status": "succeeded"
  }
}
```

**Tech:** Node.js, Kafka consumer, Bull queue (Redis-backed), SendGrid

---

### 4. Tenant Service (`/services/tenant-service`)

Multi-tenancy management — the "identity layer" of the platform.

**Responsibilities:**
- Tenant registration and onboarding
- API key generation (hashed with bcrypt, stored as hash, shown once)
- Webhook URL management
- Tenant-scoped usage metering
- Rate limit configuration per tenant tier

**Key Engineering Problem — Secure API Keys:**
API keys are shown to the tenant exactly once on creation. Only the bcrypt hash is stored in the database (similar to how passwords are stored). On each request, the presented key is hashed and compared to the stored hash. This means even a database breach doesn't expose usable API keys.

**Tech:** Node.js, Express, PostgreSQL, bcrypt, JWT

---

### 5. Fraud Detection Service (`/services/fraud-service`)

An async Kafka consumer that runs risk scoring without affecting payment latency.

**Responsibilities:**
- Consume all `payment.created` events
- Apply rule-based scoring (velocity checks, IP reputation, amount thresholds)
- Flag suspicious payments by emitting `fraud.flagged` events
- Maintain per-tenant fraud score history in TimescaleDB

**Rules Engine (examples):**
- More than 10 payments from same IP in 60 seconds → HIGH RISK
- Payment amount > 10× tenant's average transaction → MEDIUM RISK
- Card BIN country ≠ billing address country → MEDIUM RISK
- More than 3 failed payment attempts in 5 minutes → BLOCK

**Tech:** Node.js, Kafka consumer, Redis (velocity counters), TimescaleDB

---

## Event Architecture (Kafka)

Kafka is the nervous system of PayFlow. Services never call each other directly — they communicate exclusively through events.

### Topics

| Topic | Producer | Consumers | Description |
|---|---|---|---|
| `payment.created` | Payment Svc | Ledger, Notification, Fraud | Fired on every new payment |
| `payment.failed` | Payment Svc | Notification | Fired on payment failure |
| `payment.refunded` | Payment Svc | Ledger, Notification | Fired on refund |
| `ledger.updated` | Ledger Svc | Reconciliation | Balance change event |
| `webhook.dispatch` | Notification Svc | Webhook Dispatcher | Queues a webhook for delivery |
| `webhook.failed` | Webhook Dispatcher | DLQ handler | After max retries exhausted |
| `fraud.flagged` | Fraud Svc | Notification, Payment Svc | Suspicious activity alert |

### Consumer Groups

Each consumer service uses its own consumer group, so:
- Ledger and Fraud both receive every `payment.created` event independently
- Scaling up Fraud Detection horizontally means multiple instances share the load — Kafka handles partition assignment

### Dead-Letter Queue Pattern

Every topic has a corresponding `.dlq` topic (e.g., `webhook.failed.dlq`). If a consumer fails to process a message after 3 retries, it moves the message to the DLQ. A separate alert fires to Slack/PagerDuty. Ops can replay DLQ messages after fixing the root cause.

---

## Data Storage Strategy

Different services use different databases, chosen for the nature of their data.

| Service | Database | Why |
|---|---|---|
| Payment Service | PostgreSQL | ACID transactions — money cannot be half-saved |
| Ledger Service | PostgreSQL | Relational integrity for double-entry pairs |
| Tenant Service | PostgreSQL | Relational data, foreign key constraints |
| Fraud Service | TimescaleDB | Time-series data — velocity queries over time windows |
| Notification Service | PostgreSQL + Redis | Delivery logs in PG, retry queues in Redis |
| Idempotency Keys | Redis | Fast TTL-based key-value store |
| Audit Logs | S3 | Cheap, durable, append-only storage |
| Session / Tokens | Redis | Fast TTL expiry |

### Schema Highlights

**payments table (Payment Service):**
```sql
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  amount          BIGINT NOT NULL,  -- stored in smallest currency unit (paise)
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  status          payment_status NOT NULL DEFAULT 'pending',
  provider_ref    VARCHAR(255),     -- external payment provider reference
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**journal_entries table (Ledger Service):**
```sql
CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL,
  entry_type      VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  account         VARCHAR(100) NOT NULL,
  amount          BIGINT NOT NULL,
  currency        CHAR(3) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Constraint: every payment_id must have exactly one debit and one credit
```

---

## Developer Portal

A React + Vite single-page application that serves as the tenant-facing dashboard.

### Features

**Dashboard:**
- Real-time payment volume chart (last 30 days)
- Success rate gauge
- Revenue summary cards
- Recent transactions table with filtering

**API Keys:**
- Generate new keys (shown once, then never again)
- Revoke existing keys
- View key usage statistics

**Webhooks:**
- Register/update webhook endpoints
- View delivery logs with status, response code, duration
- Manually replay failed webhooks

**Analytics:**
- Payment trends by day/week/month
- Failure reason breakdown (pie chart)
- Fraud flag history
- Settlement reports (downloadable CSV)

**API Docs:**
- Auto-generated from OpenAPI spec
- Embedded Swagger UI with live "Try it out" powered by tenant's own API key

### Tech Stack

- React 18 + Vite
- TailwindCSS for styling
- Recharts for analytics charts
- React Query for data fetching and caching
- Deployed as a static site on S3 + CloudFront

---

## Infrastructure (AWS + Terraform)

All AWS infrastructure is defined in Terraform and lives in `/infrastructure/terraform`.

### What Terraform Provisions

```
infrastructure/terraform/
├── modules/
│   ├── vpc/          ← VPC, subnets, NAT gateway, route tables
│   ├── eks/          ← EKS cluster, node groups, IAM roles
│   ├── rds/          ← PostgreSQL on RDS (Multi-AZ for production)
│   ├── msk/          ← Managed Kafka (Amazon MSK)
│   ├── elasticache/  ← Redis cluster
│   ├── s3/           ← Audit log bucket with lifecycle policies
│   └── cloudfront/   ← CDN for developer portal
├── environments/
│   ├── dev/
│   └── prod/
└── main.tf
```

### AWS Services Used

| AWS Service | Purpose |
|---|---|
| EKS | Managed Kubernetes cluster |
| RDS PostgreSQL | Primary relational database (Multi-AZ) |
| Amazon MSK | Managed Kafka |
| ElastiCache Redis | Idempotency keys, rate limiting, queues |
| S3 | Audit logs, Terraform state, portal static files |
| CloudFront | CDN for developer portal |
| ACM | TLS certificates |
| Route53 | DNS management |
| IAM | Service accounts and RBAC |
| CloudWatch | Logs forwarding (to Loki) |
| Secrets Manager | Database credentials, API keys for external services |

### Networking Design

```
VPC: 10.0.0.0/16
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
│   ├── ALB (Application Load Balancer)
│   └── NAT Gateway
└── Private Subnets (10.0.10.0/24, 10.0.11.0/24)
    ├── EKS Worker Nodes
    ├── RDS instances
    ├── MSK brokers
    └── ElastiCache nodes
```

All services run in private subnets. Only the ALB is publicly accessible. Services reach the internet (for webhooks, SendGrid etc.) via NAT Gateway.

---

## Kubernetes Setup

All Kubernetes manifests live in `/infrastructure/k8s`.

### Per-Service Resources

Each microservice has:
- `Deployment` — runs 2 replicas in production
- `Service` — ClusterIP for internal communication
- `HorizontalPodAutoscaler` — scales on CPU > 70% or custom Kafka consumer lag metric
- `ConfigMap` — non-secret environment config
- `ServiceAccount` — IRSA (IAM Role for Service Accounts) for AWS permissions

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payflow-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  rules:
    - host: api.payflow.dev
      http:
        paths:
          - path: /v1/payments
            backend:
              service:
                name: payment-service
                port:
                  number: 3000
          - path: /v1/tenants
            backend:
              service:
                name: tenant-service
                port:
                  number: 3001
```

### Namespace Strategy

```
payflow-core        ← All microservices
payflow-platform    ← Observability stack (Prometheus, Grafana, Loki)
payflow-infra       ← Cert-manager, external-dns, nginx-ingress
```

---

## CI/CD and GitOps

### Repository Structure

```
github.com/yourname/payflow              ← Application code (this repo)
github.com/yourname/payflow-gitops       ← Kubernetes manifests + Helm values
```

### GitHub Actions Pipeline

Triggered on push to `main`:

```
1. Run unit tests for changed services
2. Run integration tests (Docker Compose)
3. Build Docker image
4. Push to ECR (Amazon Elastic Container Registry)
5. Update image tag in payflow-gitops repo
6. ArgoCD detects the change and syncs the cluster
```

### ArgoCD (GitOps)

ArgoCD watches the `payflow-gitops` repo. When a new image tag is committed (by GitHub Actions), ArgoCD:
1. Computes the diff between desired state (git) and current state (cluster)
2. Applies the diff
3. Reports sync status back to the GitHub PR

This means **git is the source of truth** for what runs in production. No one `kubectl apply`s manually.

### Helm Charts

Each service is packaged as a Helm chart with values files per environment:

```
helm/
├── payment-service/
│   ├── Chart.yaml
│   ├── values.yaml          ← defaults
│   ├── values.dev.yaml      ← dev overrides
│   └── values.prod.yaml     ← prod overrides (replicas: 3, resources: higher)
```

---

## Observability Stack

Deployed via Helm into the `payflow-platform` namespace.

### Metrics (Prometheus + Grafana)

Every service exposes a `/metrics` endpoint in Prometheus format.

**Custom business metrics:**
```
payflow_payments_total{tenant_id, status, currency}
payflow_payment_amount_sum{tenant_id, currency}
payflow_webhook_delivery_duration_seconds{tenant_id, status}
payflow_fraud_flags_total{tenant_id, rule}
payflow_kafka_consumer_lag{topic, consumer_group}
```

**Grafana Dashboards:**
- System health (CPU, memory, pod restarts per service)
- Business KPIs (payments/min, revenue, success rate)
- Kafka lag dashboard (consumer lag per topic)
- Fraud operations (flags, rules triggered, block rate)
- Webhook reliability (delivery rate, retry rate, DLQ size)

### Logging (Loki + Promtail)

Promtail runs as a DaemonSet on every node, tailing pod logs and shipping them to Loki. Structured JSON logs from each service include:

```json
{
  "level": "info",
  "service": "payment-service",
  "tenant_id": "ten_abc123",
  "payment_id": "pay_01J9...",
  "event": "payment.created",
  "duration_ms": 142,
  "timestamp": "2025-03-22T10:30:00.123Z"
}
```

### Alerting

Prometheus Alertmanager fires alerts to Slack for:
- Any service pod restarting more than twice in 5 minutes
- Kafka consumer lag > 1000 on any topic for > 2 minutes
- Payment success rate dropping below 95% for > 5 minutes
- DLQ messages accumulating

---

## Security Design

### Authentication Flow

```
Tenant request
  → API Gateway validates JWT or hashed API key
  → Attaches tenant_id to request context
  → Routes to service
  → Service trusts tenant_id from context (never from request body)
```

### Secrets Management

- All secrets (DB passwords, API keys for external services) stored in AWS Secrets Manager
- Kubernetes pods access secrets via External Secrets Operator (syncs from Secrets Manager to K8s Secrets)
- Never stored in git, never in environment variables hardcoded in Dockerfiles

### API Key Security

- Keys generated with `crypto.randomBytes(32)` → base64 encoded
- Only the bcrypt hash stored in the database
- Shown to tenant exactly once
- Revocable at any time (sets `revoked_at` timestamp)

### Network Security

- All inter-service communication within the cluster via ClusterIP (not exposed externally)
- NetworkPolicy restricts which pods can talk to which
- TLS terminated at the ALB; internal traffic uses mTLS via a service mesh (optional phase 6)

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- `kubectl` + `helm`
- AWS CLI (for cloud phases)
- Terraform 1.6+

### Running Locally

```bash
# Clone the repo
git clone https://github.com/yourname/payflow
cd payflow

# Start all infrastructure (Kafka, PostgreSQL, Redis, Zookeeper)
docker-compose up -d

# Run database migrations for all services
npm run migrate:all

# Start all services in dev mode (with hot reload)
npm run dev:all

# Services will be available at:
# Payment Service    → http://localhost:3000
# Ledger Service     → http://localhost:3001
# Notification Svc   → http://localhost:3002
# Tenant Service     → http://localhost:3003
# Fraud Service      → http://localhost:3004
# Developer Portal   → http://localhost:5173
# Kafka UI           → http://localhost:8080
# Grafana            → http://localhost:4000 (admin/admin)
```

### Making Your First Payment

```bash
# 1. Create a tenant
curl -X POST http://localhost:3003/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "email": "dev@acme.com"}'

# Response includes your API key (shown once):
# { "api_key": "pk_live_abc123...", "tenant_id": "ten_xyz..." }

# 2. Create a payment
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer pk_live_abc123..." \
  -H "Idempotency-Key: unique-key-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "currency": "INR", "description": "Order #1042"}'

# Watch Kafka UI to see events flow
# Watch Grafana to see metrics update
```

---

## Project Phases

### Phase 1 — Local Microservices (Week 1–2)
- [ ] Set up monorepo structure with npm workspaces
- [ ] Docker Compose with Kafka, Zookeeper, PostgreSQL, Redis
- [ ] Payment Service + Tenant Service (REST API, DB, idempotency)
- [ ] Ledger Service (Kafka consumer, double-entry writes)
- [ ] Notification Service (Kafka consumer, webhook delivery)
- [ ] Fraud Detection Service (rules engine, Redis velocity counters)
- [ ] End-to-end local test: create tenant → make payment → see ledger entry

### Phase 2 — Kubernetes (Local) (Week 3)
- [ ] Dockerize all services with multi-stage builds
- [ ] Write Kubernetes manifests (Deployment, Service, ConfigMap, HPA)
- [ ] Deploy to Minikube
- [ ] Set up NGINX Ingress Controller
- [ ] Deploy Kafka on Kubernetes (Strimzi operator)

### Phase 3 — AWS with Terraform (Week 4–5)
- [ ] Write Terraform modules: VPC, EKS, RDS, MSK, ElastiCache, S3
- [ ] Bootstrap remote state (S3 backend + DynamoDB lock table)
- [ ] Deploy infrastructure to AWS dev environment
- [ ] Configure IRSA for service accounts
- [ ] Migrate services to AWS (point to RDS, MSK, ElastiCache)

### Phase 4 — CI/CD and GitOps (Week 6)
- [ ] Set up GitHub Actions pipeline (test → build → push to ECR)
- [ ] Create `payflow-gitops` repo with Helm charts
- [ ] Install and configure ArgoCD on EKS
- [ ] Configure ArgoCD apps for each service
- [ ] Test full GitOps loop: PR merge → image build → cluster sync

### Phase 5 — Observability (Week 7)
- [ ] Deploy Prometheus + Grafana via kube-prometheus-stack Helm chart
- [ ] Deploy Loki + Promtail
- [ ] Add custom business metrics to all services
- [ ] Build Grafana dashboards (system + business + Kafka)
- [ ] Configure Alertmanager → Slack

### Phase 6 — Developer Portal (Week 8)
- [ ] Build React developer portal (dashboard, API keys, webhook logs)
- [ ] OpenAPI spec for all services
- [ ] Deploy portal to S3 + CloudFront
- [ ] Add usage metering endpoints to Tenant Service

---

## Folder Structure

```
payflow/
├── services/
│   ├── payment-service/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── kafka/
│   │   │   ├── middleware/
│   │   │   └── index.js
│   │   ├── prisma/schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── ledger-service/
│   ├── notification-service/
│   ├── tenant-service/
│   └── fraud-service/
├── portal/                    ← React developer portal
│   ├── src/
│   └── package.json
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   └── environments/
│   └── k8s/
│       ├── namespaces/
│       └── helm/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.yml
├── docker-compose.observability.yml
└── package.json               ← Monorepo root (npm workspaces)
```

---

## Key Engineering Decisions

### Why Kafka over RabbitMQ?

Kafka was chosen for its **log-based** nature — messages are retained for a configurable period (7 days by default). This means:
- Services can replay events from any point in time (critical for the reconciliation worker)
- If the Fraud Detection service goes down for 2 hours and comes back, it processes all missed events in order
- The dead-letter queue pattern is a natural fit

RabbitMQ would work fine for notification delivery (it's actually better for low-latency task queues), and the Webhook Dispatcher uses a Redis/Bull queue internally for its retry mechanism — a pragmatic hybrid.

### Why Separate Databases Per Service?

Each service owns its data. Payment Service cannot query the Ledger Service's database directly. This ensures:
- Services can scale independently
- A schema change in one service doesn't break another
- In a real team, different squads own different services without stepping on each other

The tradeoff is that cross-service queries require API calls or event-driven denormalisation. This is intentional — it forces clean domain boundaries.

### Why Idempotency at the Application Layer?

Database-level unique constraints alone aren't enough because payment processing involves external calls (to a payment provider like Stripe). The idempotency key must be checked *before* making the external call, and the response cached so retries get the same result. This is the pattern used by Stripe, Razorpay, and Braintree.

### Why TimescaleDB for Fraud Detection?

Fraud rules are fundamentally time-series queries:
- "How many payments from this IP in the last 60 seconds?"
- "What's the rolling average transaction amount for this tenant over the last 7 days?"

TimescaleDB is PostgreSQL with time-series optimisations (automatic time-based partitioning, continuous aggregates). It lets you write normal SQL while getting time-series performance.

---

## Interview Talking Points

This project gives you deep, authentic answers to the hardest system design questions:

**"How do you handle duplicate requests?"**
→ Walk through the idempotency key flow: Redis check → skip if seen → process if new → cache response.

**"How do you ensure data consistency across microservices?"**
→ Explain the saga pattern: Payment Service runs the saga coordinator, each step emits an event, compensating transactions handle failures (e.g., if Ledger write fails, emit `payment.reversal` event).

**"How do you scale this system?"**
→ Kafka consumer groups scale horizontally. HPA scales pods based on consumer lag metrics. The stateless services (payment, notification) scale to zero in dev.

**"What happens if a service goes down?"**
→ Kafka retains messages. When the service recovers, it picks up from its last committed offset. The DLQ catches messages that fail repeatedly.

**"How do you deploy without downtime?"**
→ Kubernetes rolling deployments + readiness probes. New pods only receive traffic when they pass the health check. Old pods drain gracefully.

**"How do you manage infrastructure across environments?"**
→ Terraform workspaces + per-environment variable files. The same modules deploy to dev and prod with different sizing parameters.

**"How do you know when something is wrong in production?"**
→ Custom Prometheus metrics + Alertmanager rules. Grafana dashboards show business-level health. Loki gives structured log search. End-to-end tracing via OpenTelemetry (Phase 7).