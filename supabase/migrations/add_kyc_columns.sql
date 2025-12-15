-- Add missing columns to kyc_documents table for enhanced KYC tracking

ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS document_url_back text,
ADD COLUMN IF NOT EXISTS proof_of_address_url text;

-- Add comment to document_type column
COMMENT ON COLUMN public.kyc_documents.document_type IS 'Type of ID document: passport, drivers_license, or national_id';
