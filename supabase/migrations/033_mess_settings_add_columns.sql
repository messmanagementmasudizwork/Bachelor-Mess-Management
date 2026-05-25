-- Migration 033: Add frozen_months and due_reminder_days to mess_settings table
-- These were previously stored in messes.settings JSONB column

ALTER TABLE mess_settings
  ADD COLUMN IF NOT EXISTS frozen_months TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_reminder_days INT[] DEFAULT '{7,3,1}';

-- Migrate frozen_months data from messes.settings JSONB if it exists
UPDATE mess_settings ms
SET frozen_months = ARRAY(
  SELECT jsonb_array_elements_text(m.settings->'frozen_months')
)
FROM messes m
WHERE ms.mess_id = m.id
  AND m.settings ? 'frozen_months'
  AND jsonb_array_length(m.settings->'frozen_months') > 0;

-- Migrate due_reminder_days data from messes.settings JSONB if it exists
UPDATE mess_settings ms
SET due_reminder_days = ARRAY(
  SELECT (jsonb_array_elements(m.settings->'due_reminder_days'))::int
)
FROM messes m
WHERE ms.mess_id = m.id
  AND m.settings ? 'due_reminder_days';
