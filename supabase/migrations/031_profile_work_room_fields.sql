-- Migration 031: Add work details to profiles and room info to mess_members

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company          TEXT,
  ADD COLUMN IF NOT EXISTS department       TEXT,
  ADD COLUMN IF NOT EXISTS designation      TEXT,
  ADD COLUMN IF NOT EXISTS job_joining_date DATE,
  ADD COLUMN IF NOT EXISTS job_id_card_no   TEXT;

ALTER TABLE mess_members
  ADD COLUMN IF NOT EXISTS building     TEXT,
  ADD COLUMN IF NOT EXISTS floor_number TEXT,
  ADD COLUMN IF NOT EXISTS room_number  TEXT;
