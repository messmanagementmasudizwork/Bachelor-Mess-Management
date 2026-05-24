-- Migration: 028_meeting_datetime.sql
-- Add meeting_at + reminder flags to admin_notices
-- Create send_meeting_reminders() function + pg_cron schedule

-- ── 1. New columns ────────────────────────────────────────────
ALTER TABLE admin_notices
  ADD COLUMN IF NOT EXISTS meeting_at        TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_1day_sent  BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_30min_sent BOOLEAN    NOT NULL DEFAULT FALSE;

-- Index for cron query performance
CREATE INDEX IF NOT EXISTS idx_admin_notices_meeting_reminders
  ON admin_notices (meeting_at, reminder_1day_sent, reminder_30min_sent)
  WHERE notice_type = 'meeting' AND is_published = TRUE AND meeting_at IS NOT NULL;

-- ── 2. Reminder function (SECURITY DEFINER → bypasses RLS) ───
CREATE OR REPLACE FUNCTION send_meeting_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  m RECORD;
BEGIN
  -- ── 1-day reminder ─────────────────────────────────────────
  FOR r IN
    SELECT * FROM admin_notices
    WHERE notice_type        = 'meeting'
      AND is_published       = TRUE
      AND meeting_at         IS NOT NULL
      AND meeting_at         > NOW()
      AND meeting_at - NOW() <= INTERVAL '25 hours'
      AND reminder_1day_sent = FALSE
  LOOP
    FOR m IN
      SELECT user_id FROM mess_members
      WHERE mess_id = r.mess_id AND status = 'active'
    LOOP
      INSERT INTO notifications (user_id, mess_id, type, title, body, action_url, is_read)
      VALUES (
        m.user_id,
        r.mess_id,
        'admin_notice',
        '📅 Meeting Tomorrow: ' || r.title,
        'Reminder: Meeting scheduled for ' ||
          TO_CHAR(r.meeting_at AT TIME ZONE 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM'),
        '/dashboard/administration',
        FALSE
      );
    END LOOP;
    UPDATE admin_notices SET reminder_1day_sent = TRUE WHERE id = r.id;
  END LOOP;

  -- ── 30-minute reminder ─────────────────────────────────────
  FOR r IN
    SELECT * FROM admin_notices
    WHERE notice_type         = 'meeting'
      AND is_published        = TRUE
      AND meeting_at          IS NOT NULL
      AND meeting_at          > NOW()
      AND meeting_at - NOW()  <= INTERVAL '31 minutes'
      AND reminder_30min_sent = FALSE
  LOOP
    FOR m IN
      SELECT user_id FROM mess_members
      WHERE mess_id = r.mess_id AND status = 'active'
    LOOP
      INSERT INTO notifications (user_id, mess_id, type, title, body, action_url, is_read)
      VALUES (
        m.user_id,
        r.mess_id,
        'admin_notice',
        '⏰ Meeting in 30 min: ' || r.title,
        'Your meeting starts in about 30 minutes. Be ready!',
        '/dashboard/administration',
        FALSE
      );
    END LOOP;
    UPDATE admin_notices SET reminder_30min_sent = TRUE WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── 3. pg_cron schedule (every minute) ───────────────────────
-- Enable extension first (Supabase: already available via dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old job if exists, then schedule fresh
SELECT cron.unschedule('meeting-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'meeting-reminders'
);

SELECT cron.schedule(
  'meeting-reminders',
  '* * * * *',
  'SELECT send_meeting_reminders()'
);
