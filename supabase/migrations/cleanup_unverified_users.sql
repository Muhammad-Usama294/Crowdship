-- Auto-delete unverified users after 20 minutes
-- This migration creates a cleanup function and schedules it to run every 5 minutes

-- Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup unverified users
CREATE OR REPLACE FUNCTION cleanup_unverified_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete auth users who haven't verified email in 20 minutes
    -- The CASCADE will automatically delete from public.users due to FK constraint
    WITH deleted AS (
        DELETE FROM auth.users
        WHERE created_at < NOW() - INTERVAL '20 minutes'
        AND email_confirmed_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log the cleanup action
    RAISE NOTICE 'Cleaned up % unverified user(s)', deleted_count;
    
    RETURN deleted_count;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION cleanup_unverified_users() IS 
'Deletes users who registered but never verified their email within 20 minutes. Returns count of deleted users.';

-- Schedule the cleanup job to run every 5 minutes
-- Remove existing job if it exists
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup-unverified-users') 
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-unverified-users');
EXCEPTION
    WHEN OTHERS THEN
        -- Job doesn't exist, ignore error
        NULL;
END $$;

-- Create the scheduled job
SELECT cron.schedule(
    'cleanup-unverified-users',           -- Job name
    '*/5 * * * *',                        -- Every 5 minutes (cron expression)
    'SELECT cleanup_unverified_users();'  -- SQL to execute
);

-- Verify the job was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-unverified-users') THEN
        RAISE NOTICE 'Cron job "cleanup-unverified-users" successfully scheduled';
    ELSE
        RAISE WARNING 'Failed to schedule cron job. Check pg_cron extension.';
    END IF;
END;
$$;
