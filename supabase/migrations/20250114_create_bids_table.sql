-- Create bids table for shipment bidding system
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    traveler_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    offered_price DECIMAL(10,2) NOT NULL CHECK (offered_price > 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one active bid per traveler per shipment
    UNIQUE(shipment_id, traveler_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bids_shipment ON bids(shipment_id);
CREATE INDEX IF NOT EXISTS idx_bids_traveler ON bids(traveler_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);

-- Add bidding-related columns to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS bidding_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_bid_id UUID REFERENCES bids(id),
ADD COLUMN IF NOT EXISTS auto_accept_initial_price BOOLEAN DEFAULT true;

-- Enable RLS on bids table
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Policy: Travelers can create bids on shipments they don't own
CREATE POLICY "Travelers can create bids"
ON bids FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = traveler_id AND
    EXISTS (
        SELECT 1 FROM shipments 
        WHERE id = shipment_id 
        AND status = 'pending'
        AND bidding_enabled = true
        AND sender_id != auth.uid()
    )
);

-- Policy: Travelers can view their own bids
CREATE POLICY "Travelers can view own bids"
ON bids FOR SELECT
TO authenticated
USING (auth.uid() = traveler_id);

-- Policy: Senders can view bids on their shipments
CREATE POLICY "Senders can view shipment bids"
ON bids FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM shipments 
        WHERE id = shipment_id 
        AND sender_id = auth.uid()
    )
);

-- Policy: Travelers can update their own bids (withdraw)
CREATE POLICY "Travelers can update own bids"
ON bids FOR UPDATE
TO authenticated
USING (auth.uid() = traveler_id)
WITH CHECK (auth.uid() = traveler_id);

-- Policy: Senders can update bid status (accept/reject)
CREATE POLICY "Senders can update bid status"
ON bids FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM shipments 
        WHERE id = shipment_id 
        AND sender_id = auth.uid()
    )
);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on bids
CREATE TRIGGER bids_updated_at
BEFORE UPDATE ON bids
FOR EACH ROW
EXECUTE FUNCTION update_bids_updated_at();
