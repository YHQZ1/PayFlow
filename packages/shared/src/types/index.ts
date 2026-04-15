import type {
  PaymentStatus,
  Currency,
  PaymentErrorCode,
  EntryType,
  FraudRuleType,
  WebhookDeliveryStatus,
} from "../constants";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  keyHash: string;
  keyPrefix: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  errorCode: PaymentErrorCode | null;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  tenantId: string;
  amount: number;
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  paymentId: string;
  tenantId: string;
  entryType: EntryType;
  amount: number;
  currency: Currency;
  createdAt: Date;
}

export interface FraudScore {
  id: string;
  paymentId: string;
  tenantId: string;
  score: number;
  triggeredRules: FraudRuleType[];
  flagged: boolean;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  tenantId: string;
  paymentId: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  createdAt: Date;
}
