-- ============================================================
-- 025: Add cutoff_time_mode, rename cutoff_advance_time
--      → cutoff_single_time
-- ============================================================

ALTER TABLE mess_settings
  RENAME COLUMN cutoff_advance_time TO cutoff_single_time;

ALTER TABLE mess_settings
  ADD COLUMN cutoff_time_mode TEXT NOT NULL DEFAULT 'per_meal'
    CHECK (cutoff_time_mode IN ('single', 'per_meal'));
