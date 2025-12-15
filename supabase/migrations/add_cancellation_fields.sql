-- Add cancellation tracking fields to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS cancellation_penalty DECIMAL(10,2) DEFAULT 0;

-- Add index for faster queries on cancelled shipments
CREATE INDEX IF NOT EXISTS idx_shipments_cancelled_at ON shipments(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_shipments_cancelled_by ON shipments(cancelled_by);
