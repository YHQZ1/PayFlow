import "dotenv/config";

export const services = {
  tenants: {
    name: "tenant-service",
    url: process.env.TENANT_SERVICE_URL,
    pathPrefix: "/tenants",
    healthPath: "/tenants/health",
    requiresAuth: false,
  },
  payments: {
    name: "payment-service",
    url: process.env.PAYMENT_SERVICE_URL,
    pathPrefix: "/payments",
    healthPath: "/payments/health",
    requiresAuth: true,
  },
  ledger: {
    name: "ledger-service",
    url: process.env.LEDGER_SERVICE_URL,
    pathPrefix: "/ledger",
    healthPath: "/ledger/health",
    requiresAuth: true,
  },
  fraud: {
    name: "fraud-service",
    url: process.env.FRAUD_SERVICE_URL,
    pathPrefix: "/fraud",
    healthPath: "/fraud/health",
    requiresAuth: true,
  },
  gateway: {
    name: "gateway-service",
    url: process.env.GATEWAY_SERVICE_URL,
    pathPrefix: "/gateway",
    healthPath: "/gateway/health",
    requiresAuth: false,
  },
  payouts: {
    name: "payout-service",
    url: process.env.PAYOUT_SERVICE_URL,
    pathPrefix: "/payouts",
    healthPath: "/payouts/health",
    requiresAuth: true,
  },
  reconciliation: {
    name: "reconciliation-service",
    url: process.env.RECONCILIATION_SERVICE_URL,
    pathPrefix: "/reconciliation",
    healthPath: "/reconciliation/health",
    requiresAuth: true,
  },
  notifications: {
    name: "notification-service",
    url: process.env.NOTIFICATION_SERVICE_URL,
    pathPrefix: "/notifications",
    healthPath: "/notifications/health",
    requiresAuth: false,
  },
};

export const serviceList = Object.values(services);
