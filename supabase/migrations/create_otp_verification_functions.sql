-- Function to complete delivery by verifying OTP
CREATE OR REPLACE FUNCTION complete_delivery(
    shipment_id UUID,
    otp_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the OTP matches
    IF EXISTS (
        SELECT 1 FROM shipments
        WHERE id = shipment_id
        AND delivery_otp = otp_input
        AND status = 'in_transit'
    ) THEN
        -- Update shipment status to delivered and set delivered_at timestamp
        UPDATE shipments
        SET 
            status = 'delivered',
            delivered_at = NOW()
        WHERE id = shipment_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Function to complete pickup by verifying OTP  
CREATE OR REPLACE FUNCTION complete_pickup(
    shipment_id UUID,
    otp_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the OTP matches
    IF EXISTS (
        SELECT 1 FROM shipments
        WHERE id = shipment_id
        AND pickup_otp = otp_input
        AND status = 'accepted'
    ) THEN
        -- Update shipment status to in_transit
        UPDATE shipments
        SET status = 'in_transit'
        WHERE id = shipment_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
