-- Update RLS policies to allow cancellation updates
-- This allows users to update cancellation fields on their own shipments

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own shipments" ON shipments;

-- Create updated policy that includes cancellation fields
CREATE POLICY "Users can update own shipments" ON shipments
FOR UPDATE
USING (
    auth.uid() = sender_id OR auth.uid() = traveler_id
)
WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = traveler_id
);

-- Ensure users can update their shipments including new cancellation columns
-- This is now covered by the policy above
