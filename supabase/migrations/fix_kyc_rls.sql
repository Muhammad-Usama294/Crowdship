-- Fix KYC Documents RLS for Admin Access
-- The kyc_documents table currently only allows users to view their own documents
-- This migration adds a policy to allow service role (admin) to access all documents

-- First, let's verify RLS is enabled (it should be already)
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own KYC docs" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can upload KYC docs" ON public.kyc_documents;
DROP POLICY IF EXISTS "Service role can access all KYC docs" ON public.kyc_documents;

-- Policy 1: Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC docs" 
ON public.kyc_documents
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own KYC documents
CREATE POLICY "Users can upload KYC docs" 
ON public.kyc_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Service role (admin) can SELECT all KYC documents
-- This allows admin queries via server actions with createAdminClient()
CREATE POLICY "Service role can access all KYC docs"
ON public.kyc_documents
FOR SELECT
USING (
  auth.jwt() IS NULL  -- Service role doesn't have a JWT
  OR 
  auth.jwt()->>'role' = 'service_role'
);

-- Policy 4: Service role can UPDATE KYC documents (for status changes)
CREATE POLICY "Service role can update KYC docs"
ON public.kyc_documents
FOR UPDATE
USING (
  auth.jwt() IS NULL
  OR 
  auth.jwt()->>'role' = 'service_role'
);
