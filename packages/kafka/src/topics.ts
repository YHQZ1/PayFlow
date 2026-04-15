export const Topics = {
  PAYMENT_CREATED: "payment.created",
  PAYMENT_SETTLED: "payment.settled",
  FRAUD_FLAGGED: "fraud.flagged",
  REFUND_INITIATED: "refund.initiated",
} as const;

export type Topic = (typeof Topics)[keyof typeof Topics];
