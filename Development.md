# PayFlow — Development Guide

Everything you need to start, run, and work on PayFlow locally.

---

## Prerequisites

Make sure these are installed before anything else:

- Docker Desktop (running)
- Node.js 20+
- Minikube
- kubectl

---

## Mode 1 — Local Development (recommended for coding)

Use this when you're actively writing and testing code. Services run directly on your Mac with hot reload.

### Start infrastructure

```bash
cd ~/Documents/Projects/PayFlow/infrastructure/docker
docker-compose up -d
```

Verify everything is healthy:

```bash
docker-compose ps
```

You should see postgres, redis, kafka, and kafka-ui all running.

### Start services

Open one terminal tab per service:

```bash
# Tab 1
cd ~/Documents/Projects/PayFlow/services/tenant-service && npm run dev

# Tab 2
cd ~/Documents/Projects/PayFlow/services/payment-service && npm run dev

# Tab 3
cd ~/Documents/Projects/PayFlow/services/ledger-service && npm run dev

# Tab 4
cd ~/Documents/Projects/PayFlow/services/notification-service && npm run dev

# Tab 5
cd ~/Documents/Projects/PayFlow/services/fraud-service && npm run dev

# Tab 6 (optional)
cd ~/Documents/Projects/PayFlow/portal && npm run dev
```

### Service URLs (local mode)

```
tenant-service        → http://localhost:3003
payment-service       → http://localhost:3000
ledger-service        → http://localhost:3001
notification-service  → http://localhost:3002
fraud-service         → http://localhost:3004
portal                → http://localhost:5173
kafka-ui              → http://localhost:8080
```

### Stop everything

```bash
# Ctrl+C in each service terminal tab
cd ~/Documents/Projects/PayFlow/infrastructure/docker && docker-compose stop
```

---

## Mode 2 — Kubernetes (for testing containerized version)

Use this when you want to test the Dockerized services running in Kubernetes exactly as they would in production.

### Start Minikube

```bash
minikube start
```

### Check all pods are running

```bash
kubectl get pods -n payflow
```

All pods should show `Running`. If any are not:

```bash
# Restart a specific pod
kubectl rollout restart deployment/tenant-service -n payflow

# Check why a pod is failing
kubectl logs -n payflow deployment/tenant-service
kubectl describe pod -n payflow -l app=tenant-service
```

### Expose services to your Mac

Open separate terminal tabs for each service you need — keep them open:

```bash
# Tab 1
minikube service tenant-service -n payflow --url

# Tab 2
minikube service payment-service -n payflow --url
```

Use the URLs printed (e.g. `http://127.0.0.1:XXXXX`) to make requests.

### Rebuild and redeploy a service

Run these every time you change code and want to test in Kubernetes:

```bash
# Point Docker to Minikube
eval $(minikube docker-env)

# Rebuild the image
cd ~/Documents/Projects/PayFlow/services/tenant-service
docker build -t payflow/tenant-service:latest .
cd ~/Documents/Projects/PayFlow

# Restart the deployment
kubectl rollout restart deployment/tenant-service -n payflow

# Watch it come back up
kubectl get pods -n payflow -w
```

### Run database migrations in Kubernetes

Only needed after fresh Minikube start or schema changes:

```bash
kubectl exec -n payflow deployment/tenant-service -- node src/db/migrate.js
kubectl exec -n payflow deployment/payment-service -- node src/db/migrate.js
kubectl exec -n payflow deployment/ledger-service -- node src/db/migrate.js
```

### Stop Kubernetes

```bash
minikube stop
```

Data and pod configs are preserved. Next `minikube start` brings everything back.

---

## Quick Test — verify the full flow is working

Run these in order to confirm everything is wired up correctly:

```bash
# 1. Create a tenant
curl -X POST http://localhost:3003/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Corp", "email": "test@corp.com"}'

# 2. Generate an API key (use tenant id from step 1)
curl -X POST http://localhost:3003/tenants/TENANT_ID/keys

# 3. Create a payment (use rawKey from step 2)
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer RAW_KEY" \
  -H "Idempotency-Key: test-001" \
  -d '{"amount": 50000, "currency": "INR", "description": "Test payment"}'

# 4. Verify ledger wrote journal entries
docker exec -it docker-postgres-1 psql -U payflow -d payflow_ledger \
  -c "SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 5;"

# 5. Verify balance updated
docker exec -it docker-postgres-1 psql -U payflow -d payflow_ledger \
  -c "SELECT * FROM balances;"
```

---

## Useful kubectl commands

```bash
# See all pods in payflow namespace
kubectl get pods -n payflow

# See all services
kubectl get services -n payflow

# Stream logs from a service
kubectl logs -n payflow deployment/payment-service -f

# Execute a command inside a pod
kubectl exec -it -n payflow deployment/tenant-service -- sh

# Check pod details (useful for debugging crashes)
kubectl describe pod -n payflow -l app=payment-service

# Scale a deployment
kubectl scale deployment payment-service --replicas=3 -n payflow

# Check resource usage
kubectl top pods -n payflow
```

---

## Useful Docker commands

```bash
# See all running containers
docker ps

# See logs from a container
docker logs docker-kafka-1 -f

# Connect to postgres directly
docker exec -it docker-postgres-1 psql -U payflow -d payflow_tenants

# Check all databases
docker exec -it docker-postgres-1 psql -U payflow -d payflow_tenants \
  -c "\l"

# Restart a single container
docker-compose restart kafka

# Nuclear option — wipe everything and start fresh
# WARNING: this deletes all data
docker-compose down -v && docker-compose up -d
```

---

## Ports reference

### Local development

| Service | Port |
|---|---|
| tenant-service | 3003 |
| payment-service | 3000 |
| ledger-service | 3001 |
| notification-service | 3002 |
| fraud-service | 3004 |
| portal | 5173 |
| postgres | 5432 |
| redis | 6379 |
| kafka | 9092 |
| kafka-ui | 8080 |

### Kubernetes internal (service to service)

| Service | Internal URL |
|---|---|
| tenant-service | http://tenant-service:3003 |
| payment-service | http://payment-service:3000 |
| postgres | postgres:5432 |
| redis | redis:6379 |
| kafka | kafka:9092 |

---

## Environment files

Each service has a `.env` file that is gitignored. If you clone fresh or lose your `.env` files, copy from the example:

```bash
cp services/tenant-service/.env.example services/tenant-service/.env
cp services/payment-service/.env.example services/payment-service/.env
cp services/ledger-service/.env.example services/ledger-service/.env
cp services/notification-service/.env.example services/notification-service/.env
cp services/fraud-service/.env.example services/fraud-service/.env
```

Then fill in any real values (API keys etc) in the `.env` files.

---

## Database connections

```bash
# tenant-service DB
psql postgresql://payflow:payflow@localhost:5432/payflow_tenants

# payment-service DB
psql postgresql://payflow:payflow@localhost:5432/payflow_payments

# ledger-service DB
psql postgresql://payflow:payflow@localhost:5432/payflow_ledger

# notification-service DB
psql postgresql://payflow:payflow@localhost:5432/payflow_notifications
```

---

## Project phases

```
Phase 1  ✅  All 5 services — tenant, payment, ledger, notification, fraud
Phase 2  ✅  Docker + Kubernetes (Minikube)
UI       ⬜  Developer portal (React + Vite + Tailwind)
Phase 3  ⬜  AWS with Terraform (VPC, EKS, RDS, MSK)
Phase 4  ⬜  CI/CD + GitOps (GitHub Actions + ArgoCD)
Phase 5  ⬜  Observability (Prometheus + Grafana + Loki)
```