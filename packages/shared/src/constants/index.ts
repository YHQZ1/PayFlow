export const PaymentStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Currency = {
  INR: "INR",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export const PaymentErrorCode = {
  INSUFFICIENT_FUNDS: "insufficient_funds",
  CARD_DECLINED: "card_declined",
  INVALID_CARD: "invalid_card",
  EXPIRED_CARD: "expired_card",
  PROCESSING_ERROR: "processing_error",
} as const;

export type PaymentErrorCode =
  (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

export const EntryType = {
  DEBIT: "debit",
  CREDIT: "credit",
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

export const FraudRuleType = {
  VELOCITY: "velocity",
  AMOUNT_THRESHOLD: "amount_threshold",
  REPEAT_FAILURE: "repeat_failure",
} as const;

export type FraudRuleType = (typeof FraudRuleType)[keyof typeof FraudRuleType];

export const WebhookDeliveryStatus = {
  PENDING: "pending",
  DELIVERED: "delivered",
  FAILED: "failed",
} as const;

export type WebhookDeliveryStatus =
  (typeof WebhookDeliveryStatus)[keyof typeof WebhookDeliveryStatus];
