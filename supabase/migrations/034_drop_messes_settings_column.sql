-- Migration 034: Drop the legacy messes.settings JSONB column
-- All data has been fully migrated to the dedicated mess_settings table.
-- All code (Next.js app + Edge Functions) now reads/writes mess_settings only.

ALTER TABLE messes DROP COLUMN IF EXISTS settings;
