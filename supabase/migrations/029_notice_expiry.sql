-- Migration: 029_notice_expiry.sql
-- Add expires_at column to admin_notices
-- pg_cron job to auto-expire meetings after meeting_at passes

-- ── 1. New column ─────────────────────────────────────────────
ALTER TABLE admin_notices
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- ── 2. Auto-expire meetings function ──────────────────────────
-- Runs via pg_cron every hour
-- Marks meetings as expired (sets expires_at = meeting_at) after meeting time passes
CREATE OR REPLACE FUNCTION auto_expire_meetings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notices
  SET    expires_at = meeting_at
  WHERE  notice_type  = 'meeting'
    AND  is_published = TRUE
    AND  meeting_at   IS NOT NULL
    AND  meeting_at   < NOW()
    AND  expires_at   IS NULL;
END;
$$;

-- ── 3. pg_cron: run auto_expire_meetings every hour ───────────
SELECT cron.unschedule('auto-expire-meetings') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-expire-meetings'
);

SELECT cron.schedule(
  'auto-expire-meetings',
  '0 * * * *',
  'SELECT auto_expire_meetings()'
);
