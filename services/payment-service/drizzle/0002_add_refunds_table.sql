-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  tenant_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider_ref VARCHAR(255),
  reason VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS refunds_tenant_id_idx ON refunds(tenant_id);