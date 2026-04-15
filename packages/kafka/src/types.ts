import type {
  PaymentStatus,
  PaymentErrorCode,
  FraudRuleType,
} from "@payflow/shared";

export interface KafkaEvent<T> {
  eventId: string;
  topic: string;
  tenantId: string;
  timestamp: string;
  payload: T;
}

export interface PaymentCreatedPayload {
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
}

export interface PaymentSettledPayload {
  paymentId: string;
  status: PaymentStatus;
  errorCode: PaymentErrorCode | null;
}

export interface RefundInitiatedPayload {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
}

export interface FraudFlaggedPayload {
  paymentId: string;
  score: number;
  triggeredRules: FraudRuleType[];
}
