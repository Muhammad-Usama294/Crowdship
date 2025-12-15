-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read all user profiles
-- This is necessary for displaying public profile info (name, rating) to other users
DROP POLICY IF EXISTS "Allow view access for authenticated users" ON public.users;
CREATE POLICY "Allow view access for authenticated users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Allow update for own profile" ON public.users;
CREATE POLICY "Allow update for own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins (full access) is handled by Service Role key in backend, 
-- but if we want to allow specific admin users via RLS:
-- (Assuming we stick to Service Role for admin actions for now)
