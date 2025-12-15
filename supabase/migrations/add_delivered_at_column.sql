-- Add delivered_at column to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shipments_delivered_at 
ON shipments(delivered_at) 
WHERE delivered_at IS NOT NULL;
