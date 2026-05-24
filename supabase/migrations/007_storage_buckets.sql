-- ============================================================
-- SUPABASE STORAGE BUCKETS
-- Migration: 007_storage_buckets.sql
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',   'avatars',   true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('mess-logos','mess-logos',true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('receipts',  'receipts',  false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/pdf']),
  ('media',     'media',     false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/pdf','video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage RLS Policies — avatars (public read)
-- ============================================================
CREATE POLICY "avatar_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 3. Storage RLS Policies — mess-logos (public read)
-- ============================================================
CREATE POLICY "mess_logo_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'mess-logos');

CREATE POLICY "mess_logo_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mess-logos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "mess_logo_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mess-logos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "mess_logo_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mess-logos' AND
    auth.uid() IS NOT NULL
  );

-- ============================================================
-- 4. Storage RLS Policies — receipts (mess members only)
-- ============================================================
CREATE POLICY "receipts_upload_member" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "receipts_read_member" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "receipts_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 5. Storage RLS Policies — media (complaints etc.)
-- ============================================================
CREATE POLICY "media_upload_member" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "media_read_member" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "media_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
