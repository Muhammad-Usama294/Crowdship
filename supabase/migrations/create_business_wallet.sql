-- Create business wallet table
CREATE TABLE IF NOT EXISTS business_wallet (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    balance DECIMAL(10, 2) DEFAULT 0,
    total_earned DECIMAL(10, 2) DEFAULT 0,
    total_withdrawn DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create business wallet transactions table
CREATE TABLE IF NOT EXISTS business_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES shipments(id),
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT CHECK (type IN ('commission', 'withdrawal')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize business wallet with single row (if not exists)
INSERT INTO business_wallet (id, balance, total_earned, total_withdrawn)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_shipment 
ON business_wallet_transactions(shipment_id);

CREATE INDEX IF NOT EXISTS idx_business_wallet_transactions_created 
ON business_wallet_transactions(created_at DESC);
