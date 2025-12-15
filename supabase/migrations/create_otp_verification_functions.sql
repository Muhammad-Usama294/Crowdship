-- Function to complete delivery by verifying OTP
CREATE OR REPLACE FUNCTION complete_delivery(
    shipment_id UUID,
    otp_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shipment RECORD;
    v_base_amount DECIMAL(10, 2);
    v_commission DECIMAL(10, 2);
    v_traveler_amount DECIMAL(10, 2);
BEGIN
    -- Get shipment details
    SELECT * INTO v_shipment FROM shipments WHERE id = shipment_id;
    
    -- Check if the OTP matches
    IF v_shipment.delivery_otp = otp_input AND v_shipment.status = 'in_transit' THEN
        -- Calculate commission (10% of total price)
    -- If stored price is $10 -> Commission is $1, Traveler gets $9
    v_commission := v_shipment.offer_price * 0.10;
    v_traveler_amount := v_shipment.offer_price - v_commission;
        
        -- Update shipment status to delivered and set delivered_at timestamp
        UPDATE shipments
        SET 
            status = 'delivered',
            delivered_at = NOW()
        WHERE id = shipment_id;
        
        -- Add commission to business wallet
        UPDATE business_wallet
        SET 
            balance = balance + v_commission,
            total_earned = total_earned + v_commission,
            updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001';
        
        -- Record transaction
        INSERT INTO business_wallet_transactions (shipment_id, amount, type, description)
        VALUES (shipment_id, v_commission, 'commission', 'Commission from shipment delivery');
        
        -- Pay traveler (base amount, no commission)
        UPDATE users
        SET wallet_balance = wallet_balance + v_traveler_amount
        WHERE id = v_shipment.traveler_id;
        
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
