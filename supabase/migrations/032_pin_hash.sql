-- Enable pgcrypto extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add pin_hash column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- ──────────────────────────────────────────────────────────────
-- RPC: set_action_pin
-- Hashes the given PIN with bcrypt and stores in profiles
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_action_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET pin_hash  = crypt(p_pin, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- RPC: verify_action_pin
-- Returns TRUE if the pin matches stored hash (or no PIN is set)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_action_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM profiles
  WHERE id = auth.uid();

  -- No PIN set → always pass
  IF stored_hash IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN stored_hash = crypt(p_pin, stored_hash);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- RPC: remove_action_pin
-- Clears the stored PIN hash
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION remove_action_pin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET pin_hash  = NULL,
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- RPC: is_action_pin_set
-- Returns TRUE if a PIN hash is stored for the current user
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_action_pin_set()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM profiles
  WHERE id = auth.uid();

  RETURN stored_hash IS NOT NULL;
END;
$$;
