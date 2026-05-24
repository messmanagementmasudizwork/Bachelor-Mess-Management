-- Add notification_preferences JSONB column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
  "expense_added": true,
  "deposit_confirmed": true,
  "meal_reminder": true,
  "due_reminder": true,
  "manager_changed": true,
  "low_balance": true
}'::jsonb;
