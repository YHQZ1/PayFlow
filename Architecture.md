# PayFlow — System Architecture

> A deep-dive into every architectural decision, pattern, and tradeoff in the PayFlow payment processing platform.

---

## Table of Contents

1. [Architectural Philosophy](#architectural-philosophy)
2. [High-Level System Map](#high-level-system-map)
3. [Domain Model](#domain-model)
4. [Service Architecture](#service-architecture)
5. [Event-Driven Design](#event-driven-design)
6. [Data Architecture](#data-architecture)
7. [API Design](#api-design)
8. [Infrastructure Architecture](#infrastructure-architecture)
9. [Kubernetes Architecture](#kubernetes-architecture)
10. [Security Architecture](#security-architecture)
11. [Observability Architecture](#observability-architecture)
12. [CI/CD Architecture](#cicd-architecture)
13. [Failure Modes and Resilience](#failure-modes-and-resilience)
14. [Scaling Strategy](#scaling-strategy)
15. [Architectural Decision Records](#architectural-decision-records)

---

## Architectural Philosophy

PayFlow is built around three core architectural principles:

**1. Autonomy over Coupling**
Services share nothing except event schemas. No shared databases, no shared libraries that couple release cycles, no synchronous dependency chains. Every service can be deployed, scaled, and failed independently.

**2. Events as the Source of Truth**
The Kafka event log is the canonical record of what happened in the system. Databases are projections of events. Any service can rebuild its state by replaying the event log from the beginning.

**3. Failure is Normal**
Every design decision assumes that any service, network, or external dependency will fail. The system compensates with idempotent operations, retry queues, dead-letter handling, and circuit breakers rather than trying to prevent failures.

---

## High-Level System Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL LAYER                              │
│                                                                          │
│  ┌───────────────┐    ┌───────────────────┐    ┌──────────────────────┐ │
│  │ Tenant Apps   │    │ Developer Portal  │    │  External Providers  │ │
│  │ (API clients) │    │ (React SPA)       │    │  (SendGrid, Stripe   │ │
│  │               │    │ S3 + CloudFront   │    │   mock, SMS gateway) │ │
│  └───────┬───────┘    └────────┬──────────┘    └──────────┬───────────┘ │
└──────────┼─────────────────────┼───────────────────────────┼────────────┘
           │ HTTPS               │ HTTPS                     │ HTTPS
           ▼                     ▼                           ▲
┌─────────────────────────────────────────────────────────────────────────┐
│                           EDGE / GATEWAY LAYER                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    AWS Application Load Balancer                  │   │
│  │              TLS termination · WAF rules · DDoS protection        │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌──────────────────────────────▼───────────────────────────────────┐   │
│  │                   NGINX Ingress Controller (K8s)                  │   │
│  │         Path-based routing · Rate limiting · Auth header inject   │   │
│  └──────┬──────────────┬──────────────┬──────────────┬──────────────┘   │
└─────────┼──────────────┼──────────────┼──────────────┼──────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER (EKS)                         │
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  Payment     │ │   Ledger     │ │ Notification │ │   Tenant     │   │
│  │  Service     │ │   Service    │ │   Service    │ │   Service    │   │
│  │  :3000       │ │   :3001      │ │   :3002      │ │   :3003      │   │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘   │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Amazon MSK (Kafka)                          │    │
│  │   payment.created · ledger.updated · webhook.dispatch            │    │
│  │   payment.failed · fraud.flagged · webhook.failed.dlq            │    │
│  └──────────────────────┬──────────────────────────────────────────┘    │
│                         │                                               │
│            ┌────────────┴──────────────┐                               │
│            ▼                           ▼                               │
│  ┌──────────────────┐       ┌────────────────────────┐                │
│  │  Fraud Detection │       │   Webhook Dispatcher    │                │
│  │  Service :3004   │       │   (Bull + Redis)        │                │
│  └──────────────────┘       └────────────────────────┘                │
│                                                                         │
│  ┌──────────────────┐                                                  │
│  │  Reconciliation  │  ← Runs as a CronJob (nightly 00:00 IST)        │
│  │  Worker          │                                                  │
│  └──────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────┘
          │                                           │
          ▼                                           ▼
┌──────────────────────────────┐     ┌───────────────────────────────────┐
│         DATA LAYER           │     │          PLATFORM LAYER            │
│                              │     │                                    │
│  ┌─────────┐  ┌───────────┐  │     │  ┌──────────┐  ┌──────────────┐  │
│  │  RDS    │  │TimescaleDB│  │     │  │Prometheus│  │   Grafana    │  │
│  │Postgres │  │(Fraud/    │  │     │  │+ Alert   │  │  Dashboards  │  │
│  │Multi-AZ │  │ Analytics)│  │     │  │ manager  │  │              │  │
│  └─────────┘  └───────────┘  │     │  └──────────┘  └──────────────┘  │
│  ┌─────────┐  ┌───────────┐  │     │  ┌──────────┐  ┌──────────────┐  │
│  │Elasticache│ │    S3     │  │     │  │  Loki +  │  │   ArgoCD     │  │
│  │  Redis  │  │(Audit logs│  │     │  │ Promtail │  │  (GitOps)    │  │
│  │Cluster  │  │ + Portal) │  │     │  │          │  │              │  │
│  └─────────┘  └───────────┘  │     │  └──────────┘  └──────────────┘  │
└──────────────────────────────┘     └───────────────────────────────────┘
```

---

## Domain Model

PayFlow is organized into four bounded contexts, each owned by one or more services.

```
┌───────────────────────────────────────────────────────────────────┐
│                      PAYMENT PROCESSING                            │
│                                                                    │
│  Payment ──────────── belongs to ────────────► Tenant             │
│     │                                             │               │
│     ├── has status (pending/succeeded/failed)     │               │
│     ├── has IdempotencyKey                        │               │
│     ├── triggers ──────────────────────────► Event                │
│     └── may have ──────────────────────────► Refund               │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                         LEDGER                                     │
│                                                                    │
│  JournalEntry ──── references ──────────────► Payment             │
│     │                                                             │
│     ├── entry_type: debit | credit                               │
│     ├── account: accounts_receivable | revenue | refunds          │
│     └── always created in pairs (debit + credit)                 │
│                                                                   │
│  Balance ──── aggregated from ──────────────► JournalEntry[]     │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      TENANT MANAGEMENT                             │
│                                                                    │
│  Tenant ──────────── has many ──────────────► ApiKey              │
│     │                                            │               │
│     ├── has many ──────────────────────────► WebhookEndpoint      │
│     ├── has many ──────────────────────────► Payment              │
│     └── has one ───────────────────────────► UsageQuota           │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      NOTIFICATIONS                                 │
│                                                                    │
│  WebhookDelivery ── references ─────────────► Event              │
│     │                                                             │
│     ├── status: pending | delivered | failed | exhausted          │
│     ├── attempt_count                                             │
│     ├── next_retry_at                                             │
│     └── response_body, response_status                           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Service Architecture

### Payment Service — Request Flow

```
POST /v1/payments
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Auth Middleware                                           │
│    Extract tenant_id from JWT / API key hash lookup         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Idempotency Check (Redis)                                │
│    key = hash(tenant_id + idempotency_key_header)           │
│    IF exists → return cached response (HTTP 200)            │
│    IF not    → SET key with 30s TTL (prevents race)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ key was new
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Validate Request                                         │
│    amount > 0, currency supported, tenant active            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Begin Database Transaction                               │
│    INSERT payment (status = 'pending')                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Call Payment Provider (Stripe mock)                      │
│    IF success → UPDATE payment (status = 'succeeded')       │
│    IF failure → UPDATE payment (status = 'failed')          │
│    COMMIT transaction                                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Emit Kafka Event                                         │
│    topic: payment.created (or payment.failed)               │
│    Note: event is emitted AFTER DB commit (outbox pattern)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Cache Response in Redis (idempotency TTL: 24h)           │
│    Return HTTP 201 to client                                │
└─────────────────────────────────────────────────────────────┘
```

### Saga Pattern — Handling Distributed Failures

When a payment is created, multiple services must update their state consistently. PayFlow uses the **choreography-based saga pattern** (no central orchestrator):

```
Payment Service creates payment (status: pending)
         │
         ├──► emits payment.created
         │         │
         │         ├──► Ledger Service writes journal entry
         │         │              └── emits ledger.updated
         │         │
         │         ├──► Notification Service queues webhook
         │         │
         │         └──► Fraud Service runs risk score
         │                        └── emits fraud.flagged (if risky)
         │                                   │
         │                         Payment Service listens
         │                         IF fraud.flagged AND severity = HIGH:
         │                           UPDATE payment (status: blocked)
         │                           emit payment.blocked
         │
         └── If payment provider call fails:
               emit payment.failed
               Ledger Service listens → no journal entry (no-op)
               Notification Service listens → sends failure webhook
```

**Compensating Transactions:**
If any downstream step fails in a way that requires rollback, a compensating event is emitted:

| Forward Event | Compensating Event |
|---|---|
| `payment.created` | `payment.reversed` |
| `ledger.updated` | `ledger.reversal` |
| `webhook.delivered` | *(no compensation needed)* |

---

## Event-Driven Design

### Topic Configuration

```
Topic: payment.created
  Partitions: 12
  Replication factor: 3
  Retention: 7 days
  Partition key: tenant_id
  (All payments for a tenant go to the same partition → ordered per tenant)

Topic: webhook.dispatch
  Partitions: 6
  Replication factor: 3
  Retention: 3 days
  Partition key: tenant_id

Topic: webhook.failed.dlq
  Partitions: 3
  Replication factor: 3
  Retention: 30 days  ← Long retention for manual replay
```

### Event Schema (Avro / JSON Schema)

```json
{
  "$schema": "payment.created/v1",
  "type": "object",
  "required": ["event_id", "event_type", "tenant_id", "payload", "metadata"],
  "properties": {
    "event_id":   { "type": "string", "format": "uuid" },
    "event_type": { "type": "string", "enum": ["payment.created"] },
    "tenant_id":  { "type": "string" },
    "payload": {
      "payment_id":  { "type": "string" },
      "amount":      { "type": "integer" },
      "currency":    { "type": "string" },
      "status":      { "type": "string" }
    },
    "metadata": {
      "produced_at":    { "type": "string", "format": "date-time" },
      "producer":       { "type": "string" },
      "schema_version": { "type": "string" }
    }
  }
}
```

**Schema versioning rule:** Breaking changes require a new schema version (v2). Both versions are produced simultaneously during migration. Consumers migrate at their own pace. Old versions are sunset after all consumers have migrated.

### Consumer Group Design

```
Consumer Group: ledger-service-cg
  Subscribes to: payment.created, payment.refunded
  Parallelism: 1 consumer per partition (12 max)
  Commit strategy: manual, after successful DB write

Consumer Group: fraud-service-cg
  Subscribes to: payment.created
  Parallelism: up to 12
  Commit strategy: manual, after risk score computed

Consumer Group: notification-service-cg
  Subscribes to: payment.created, payment.failed, payment.refunded, fraud.flagged
  Parallelism: up to 6
  Commit strategy: manual, after webhook queued in Redis/Bull
```

### Dead-Letter Queue Flow

```
Consumer receives message
       │
       ▼
Process message
       │
   ┌───┴────┐
   │Success?│
   └───┬────┘
       │ NO
       ▼
Increment retry_count in message header
       │
  retry_count < 3?
       │ YES          │ NO
       ▼              ▼
Re-queue to      Produce to
same topic       topic.dlq
(with delay)
       │
       ▼
Alertmanager fires
"DLQ message count > 0"
       │
       ▼
On-call engineer investigates
→ Fixes root cause
→ Replays DLQ topic from beginning
```

---

## Data Architecture

### Database Per Service (Enforced Isolation)

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  payment_db     │    │  ledger_db      │    │  tenant_db       │
│  (PostgreSQL)   │    │  (PostgreSQL)   │    │  (PostgreSQL)    │
│                 │    │                 │    │                  │
│  payments       │    │  journal_entries│    │  tenants         │
│  refunds        │    │  balances       │    │  api_keys        │
│  idempotency    │    │                 │    │  webhook_endpoints│
│  _keys (Redis)  │    │                 │    │  usage_quotas    │
└─────────────────┘    └─────────────────┘    └──────────────────┘

┌─────────────────┐    ┌─────────────────────────────────────────┐
│  notification_db│    │  fraud_db (TimescaleDB)                 │
│  (PostgreSQL)   │    │                                         │
│                 │    │  payment_events (hypertable)            │
│  webhook_       │    │  ← auto-partitioned by created_at       │
│  deliveries     │    │                                         │
│  webhook_logs   │    │  fraud_scores                          │
│                 │    │  velocity_counters                      │
└─────────────────┘    └─────────────────────────────────────────┘
```

### Read vs Write Separation (Payment Service)

```
                   ┌─────────────────┐
                   │   Payment Svc   │
                   └────────┬────────┘
                            │
              ┌─────────────┴───────────────┐
              │                             │
              ▼ Writes                      ▼ Reads
    ┌──────────────────┐          ┌──────────────────────┐
    │  RDS Primary     │          │  RDS Read Replica     │
    │  (Multi-AZ)      │          │                      │
    │  - CREATE payment│          │  - GET /payments      │
    │  - UPDATE status │          │  - GET /payments/:id  │
    │  - REFUND        │ replicates│ - LIST /payments     │
    └──────────────────┘─────────►└──────────────────────┘
```

### Audit Log Architecture

Every state-changing operation writes an append-only audit record to S3:

```
s3://payflow-audit-logs/
├── year=2025/
│   ├── month=03/
│   │   ├── day=22/
│   │   │   ├── payment-service/
│   │   │   │   └── events-2025-03-22-10-00.jsonl.gz
│   │   │   └── tenant-service/
│   │   │       └── events-2025-03-22-10-00.jsonl.gz
```

S3 lifecycle policy: move to Glacier after 90 days. Retain for 7 years (financial compliance).

---

## API Design

### Versioning Strategy

All APIs are versioned at the URL level (`/v1/`, `/v2/`). Breaking changes require a new version. Old versions are deprecated with a `Sunset` header and retired after 6 months.

### Request / Response Conventions

```
Headers (all requests):
  Authorization: Bearer <api_key>
  Idempotency-Key: <client-generated UUID>     ← Required for POST
  Content-Type: application/json
  X-Request-ID: <UUID>                         ← For distributed tracing

Headers (all responses):
  X-Request-ID: <echoed from request>
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 847
  X-RateLimit-Reset: 1711101600

Error Response Format:
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "The payment could not be processed.",
    "details": { "decline_code": "insufficient_funds" },
    "request_id": "req_01J9XZ..."
  }
}
```

### Rate Limiting Strategy

```
Tier           Requests/min    Burst
─────────────────────────────────────
Starter        100             120
Growth         1,000           1,200
Enterprise     10,000          12,000
```

Rate limits are enforced at the NGINX Ingress layer using tenant_id (extracted from API key) as the limit key. State is stored in Redis.

### Pagination

All list endpoints use cursor-based pagination (not offset):

```json
GET /v1/payments?limit=50&after=pay_01J9XZ...

{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "pay_01J9AB...",
    "total_count": 1423
  }
}
```

Cursor-based pagination is consistent when new records are inserted during iteration — offset pagination skips or duplicates records if the underlying data changes between pages.

---

## Infrastructure Architecture

### AWS Account Structure

```
AWS Organization
├── Management Account (billing, SCPs)
├── Dev Account
│   ├── EKS cluster (dev)
│   ├── RDS (small instance, single-AZ)
│   └── MSK (single broker)
└── Prod Account
    ├── EKS cluster (prod, multi-AZ node groups)
    ├── RDS (Multi-AZ, read replica)
    └── MSK (3 brokers, 3 AZs)
```

### Terraform State Management

```
s3://payflow-tf-state/
├── dev/terraform.tfstate
└── prod/terraform.tfstate

DynamoDB table: payflow-tf-locks
  ← Prevents concurrent Terraform runs
     (uses DynamoDB's conditional writes for locking)
```

### VPC Architecture (Production)

```
Region: ap-south-1 (Mumbai)

VPC: 10.0.0.0/16
│
├── Availability Zone: ap-south-1a
│   ├── Public Subnet:  10.0.1.0/24
│   │   └── NAT Gateway, ALB node
│   └── Private Subnet: 10.0.10.0/24
│       ├── EKS worker nodes
│       ├── RDS primary
│       └── MSK broker 1
│
├── Availability Zone: ap-south-1b
│   ├── Public Subnet:  10.0.2.0/24
│   │   └── ALB node
│   └── Private Subnet: 10.0.11.0/24
│       ├── EKS worker nodes
│       ├── RDS standby (Multi-AZ failover)
│       └── MSK broker 2
│
└── Availability Zone: ap-south-1c
    ├── Public Subnet:  10.0.3.0/24
    └── Private Subnet: 10.0.12.0/24
        ├── EKS worker nodes
        └── MSK broker 3
```

---

## Kubernetes Architecture

### Cluster Layout

```
EKS Cluster
├── System Node Group (t3.medium × 2, On-Demand)
│   └── kube-system, cert-manager, ingress-nginx, argocd
│
├── Application Node Group (t3.large × 3, On-Demand + Spot mix)
│   └── payflow-core namespace
│       ├── payment-service   (replicas: 3)
│       ├── ledger-service    (replicas: 2)
│       ├── notification-svc  (replicas: 2)
│       ├── tenant-service    (replicas: 2)
│       └── fraud-service     (replicas: 2)
│
└── Platform Node Group (t3.medium × 2, On-Demand)
    └── payflow-platform namespace
        ├── prometheus
        ├── grafana
        ├── loki
        └── promtail (DaemonSet — runs on all nodes)
```

### Pod Autoscaling

```yaml
# Horizontal Pod Autoscaler — Payment Service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External
      external:
        metric:
          name: kafka_consumer_lag
          selector:
            matchLabels:
              topic: payment.created
              consumer_group: payment-service-cg
        target:
          type: AverageValue
          averageValue: "100"
```

### Health Check Design

```
Liveness probe:  GET /health/live
  → Returns 200 if the process is running
  → Returns 500 if the process is deadlocked
  → Kubernetes restarts the pod on failure

Readiness probe: GET /health/ready
  → Returns 200 if DB connection is up AND Kafka producer is connected
  → Returns 503 if any dependency is down
  → Kubernetes removes pod from load balancer on failure (no traffic sent)

Startup probe:   GET /health/live (checked every 5s for first 60s)
  → Gives slow-starting pods time to initialize DB connections
```

### Resource Requests and Limits

```yaml
resources:
  requests:
    cpu: "100m"       # Guaranteed minimum (0.1 CPU core)
    memory: "256Mi"   # Guaranteed minimum
  limits:
    cpu: "500m"       # Max burst (0.5 CPU core)
    memory: "512Mi"   # OOM-killed if exceeded
```

---

## Security Architecture

### Authentication Flow (Full Detail)

```
Client Request
  Header: Authorization: Bearer pk_live_abc123xyz...
                │
                ▼
         NGINX Ingress
         (passes header through)
                │
                ▼
         API Key Middleware (runs in each service)
                │
         1. Extract raw key from header
         2. Hash with SHA-256 (fast, for lookup)
         3. SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL
         4. IF not found → 401 Unauthorized
         5. IF found → attach tenant_id to request context
         6. UPDATE api_keys SET last_used_at = NOW()
                │
                ▼
         Request handler
         (uses req.context.tenant_id — never trusts body/query params for tenant identity)
```

### Secrets Flow (Kubernetes + AWS Secrets Manager)

```
AWS Secrets Manager
  └── secret: payflow/prod/payment-service
       ├── DB_PASSWORD: "..."
       ├── KAFKA_PASSWORD: "..."
       └── SENDGRID_API_KEY: "..."
              │
              ▼ (synced every 1 hour)
External Secrets Operator
              │
              ▼ (creates K8s Secret)
Kubernetes Secret: payment-service-secrets
              │
              ▼ (mounted as env vars)
payment-service Pod
  env:
    DB_PASSWORD: <from secret>
```

### Network Policies

```yaml
# Only allow payment-service to talk to its own DB
# and to Kafka — nothing else
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-netpol
spec:
  podSelector:
    matchLabels:
      app: payment-service
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: payment-db        # Own database
    - to:
        - podSelector:
            matchLabels:
              app: kafka             # Kafka brokers
    - to:
        - podSelector:
            matchLabels:
              app: redis             # Idempotency store
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress     # Only ingress controller
```

---

## Observability Architecture

### Three Pillars

```
METRICS (Prometheus)          LOGS (Loki)              TRACES (OpenTelemetry)
─────────────────────         ──────────────────        ─────────────────────
What is happening?            Why did it happen?         Where did time go?

payments_total{status}        "payment failed:           payment-svc → kafka
payment_duration_p99          invalid card number"        → ledger-svc
kafka_consumer_lag            "DB connection timeout"     → notification-svc
fraud_flags_total             "retry attempt 3/3"         (total: 143ms)
```

### Metrics Pipeline

```
Each Service (/metrics endpoint)
       │
       ▼
Prometheus (scrapes every 15s)
       │
       ├──► Grafana (visualization)
       │
       └──► Alertmanager
                 │
           ┌─────┴────────┐
           ▼              ▼
         Slack        PagerDuty
       (warnings)    (critical)
```

### Alert Runbook (Examples)

```
Alert: PaymentSuccessRateLow
  Condition:  rate(payments_total{status="failed"}[5m]) /
              rate(payments_total[5m]) > 0.05
  Severity:   critical
  Runbook:
    1. Check payment-service logs in Grafana/Loki
    2. Check external provider (Stripe mock) status
    3. Check DB connection pool saturation
    4. If provider down: circuit breaker should engage in 30s

Alert: KafkaConsumerLagHigh
  Condition:  kafka_consumer_lag{topic="payment.created"} > 1000
  Severity:   warning
  Runbook:
    1. Check consumer pod count and CPU
    2. Scale up HPA manually if auto-scaling is slow
    3. Check if any consumer is in error loop
```

---

## CI/CD Architecture

### Full Pipeline Flow

```
Developer pushes to feature branch
              │
              ▼
GitHub Actions: PR checks
  ├── lint (ESLint)
  ├── unit tests (Jest)
  ├── type check
  └── security scan (npm audit)
              │
              ▼ (PR approved + merged to main)
GitHub Actions: Build & Deploy pipeline
              │
  ┌───────────▼────────────────────────────────────────────┐
  │ Detect which services changed (path filtering)         │
  │   Only build changed services — not all 5 every time   │
  └───────────┬────────────────────────────────────────────┘
              │
              ▼
  Run integration tests (Docker Compose in CI)
              │
              ▼
  Build Docker image (multi-stage)
  Tag: <service>:<git-sha>
              │
              ▼
  Push to ECR (Amazon Elastic Container Registry)
              │
              ▼
  Commit new image tag to payflow-gitops repo
  File: helm/<service>/values.prod.yaml
  image.tag: <new-git-sha>
              │
              ▼ (ArgoCD detects repo change)
ArgoCD Sync
  ├── Compute diff (desired state vs cluster state)
  ├── Apply rolling update (new pods → health check → drain old pods)
  └── Report sync status to GitHub PR as commit status
```

### Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S payflow && adduser -S payflow -G payflow
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER payflow
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Final image size target: < 150MB (vs 1GB+ if using node:20 base).

---

## Failure Modes and Resilience

### Circuit Breaker (Payment Provider)

```
Payment Service calls external provider
         │
  Track last 10 calls
         │
  ┌──────▼──────────┐
  │ CLOSED (normal) │ ← < 3 failures in last 10 calls
  └──────┬──────────┘
         │ 3+ failures
         ▼
  ┌──────────────────┐
  │ OPEN (tripped)   │ ← All calls fail fast (no external call)
  │ (for 30 seconds) │   Return 503 immediately
  └──────┬───────────┘
         │ After 30s
         ▼
  ┌──────────────────┐
  │ HALF-OPEN        │ ← Allow 1 test call through
  └──────┬───────────┘
         │ success      │ failure
         ▼              ▼
      CLOSED          OPEN (reset timer)
```

### Graceful Shutdown

When Kubernetes sends `SIGTERM` to a pod:

```
1. Stop accepting new HTTP connections
2. Wait for in-flight requests to complete (max 30s)
3. Flush Kafka producer buffer (commit pending messages)
4. Close DB connection pool cleanly
5. Exit with code 0
```

This ensures no requests are dropped during rolling deployments.

### What Happens When...

| Failure | Impact | Recovery |
|---|---|---|
| Payment Service pod crashes | Kubernetes restarts it in < 10s. In-flight requests on that pod fail (clients retry with idempotency key). | Automatic |
| Kafka broker goes down | MSK has 3 brokers. Producers/consumers failover to other brokers automatically. | Automatic (MSK) |
| RDS primary fails | Multi-AZ standby promoted in ~60s. App reconnects automatically. | Automatic (RDS Multi-AZ) |
| Notification Service down for 2h | Kafka retains messages. On recovery, consumer processes backlog in order. | Automatic (Kafka retention) |
| Webhook endpoint returns 500 | Bull queue retries with exponential backoff up to 5 times over 24h. Then moves to DLQ. | Automatic + alert |
| Redis goes down | Idempotency checks fail open (payment proceeds). Log warning. Replace Redis in < 5min (ElastiCache auto-recovery). | Mostly automatic |

---

## Scaling Strategy

### Per-Service Scaling Trigger

| Service | Primary Scale Trigger | Max Replicas |
|---|---|---|
| Payment Service | CPU > 70% OR Kafka consumer lag | 20 |
| Ledger Service | Kafka consumer lag on payment.created | 12 |
| Notification Service | Kafka consumer lag | 10 |
| Fraud Service | Kafka consumer lag | 12 |
| Tenant Service | CPU > 70% (mostly read traffic) | 6 |

### Kafka Partition Strategy

Partition count determines max consumer parallelism. `payment.created` has 12 partitions → max 12 Fraud Detection pods can consume in parallel (one per partition). More pods would be idle.

Partitioning by `tenant_id` ensures all events for a tenant go to the same partition → same consumer → **per-tenant event ordering is preserved**.

### Database Scaling Path

```
Phase 1 (< 10k payments/day):
  Single RDS instance
  
Phase 2 (< 100k payments/day):
  RDS Multi-AZ + 1 read replica
  Read traffic (GET /payments) → read replica
  Write traffic → primary
  
Phase 3 (< 1M payments/day):
  PgBouncer connection pooler in front of RDS
  TimescaleDB for analytics queries (offload from primary)
  
Phase 4 (> 1M payments/day):
  Consider Citus (distributed PostgreSQL)
  Or shard by tenant_id across multiple RDS instances
```

---

## Architectural Decision Records

### ADR-001: Kafka over RabbitMQ

**Context:** Need an event bus for inter-service communication.

**Decision:** Use Kafka (Amazon MSK).

**Reasons:**
- Log-based retention enables event replay (critical for reconciliation and recovering crashed services)
- Consumer groups allow multiple independent consumers of the same event
- Partition-based ordering guarantees per-tenant event sequence
- MSK removes operational overhead of managing Kafka ourselves

**Tradeoff:** Kafka has higher operational complexity than RabbitMQ. Higher minimum cost (3-broker MSK cluster vs single RabbitMQ instance). Offset management requires more careful consumer implementation.

---

### ADR-002: Choreography over Orchestration for Sagas

**Context:** Multi-service transactions (payment → ledger → notification) need coordination.

**Decision:** Choreography-based saga (services react to events) rather than orchestration (central saga coordinator).

**Reasons:**
- No single point of failure (the orchestrator)
- Services remain independently deployable
- Simpler to start with; can migrate to orchestration if complexity grows

**Tradeoff:** Harder to visualize the overall flow. Debugging a failed saga requires correlating events across multiple services using the `payment_id` as a correlation key.

---

### ADR-003: Database Per Service

**Context:** Multiple services need persistent storage.

**Decision:** Each service owns its own database, inaccessible to other services.

**Reasons:**
- Independent deployability — schema changes in one service don't break others
- Technology choice freedom — Fraud Service uses TimescaleDB, others use PostgreSQL
- Clear ownership boundaries

**Tradeoff:** Cross-service aggregations require API calls or event-driven denormalisation. No JOINs across service boundaries. Eventual consistency instead of strong consistency for cross-service data.

---

### ADR-004: Cursor-Based Pagination

**Context:** List endpoints must handle tenants with large datasets.

**Decision:** Use cursor-based pagination instead of offset/limit.

**Reasons:**
- Consistent results when records are inserted during iteration (offset skips or duplicates records)
- O(1) query cost regardless of page number (offset queries get slower as page number grows — `OFFSET 10000` scans 10,000 rows to discard them)

**Tradeoff:** Cannot jump to an arbitrary page number. Client must iterate sequentially.

---

### ADR-005: GitOps with ArgoCD

**Context:** Need a deployment mechanism for Kubernetes.

**Decision:** ArgoCD watching a separate `payflow-gitops` repo. Application repo (code) and config repo (k8s manifests) are separate.

**Reasons:**
- Git is the audit trail for every deployment. `git log` on the gitops repo shows what was deployed when and by whom.
- Rollback is a `git revert` — no special commands needed
- ArgoCD detects drift (someone manually ran `kubectl apply`) and can auto-heal
- Separation of code and config repos means a config change (scale up replicas) doesn't trigger a full rebuild

**Tradeoff:** Two repos to manage. PRs to the gitops repo are automated (by CI) but can still be reviewed before ArgoCD syncs (if using manual sync mode).