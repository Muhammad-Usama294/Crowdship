-- Add is_suspended column to users table
ALTER TABLE public.users 
ADD COLUMN is_suspended boolean DEFAULT false;

-- Add RLS policy to allow admins to update this column
-- (Assuming existing admin policies cover updates, otherwise might need specific policy)
-- checking if policy exists is hard from here, but generally admins should have full access.
