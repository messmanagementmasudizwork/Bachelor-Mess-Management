-- Add UI preference columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ui_theme TEXT NOT NULL DEFAULT 'system' CHECK (ui_theme IN ('light', 'dark', 'system')),
ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT '৳' CHECK (currency_symbol IN ('৳', 'Tk', 'BDT')),
ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'd MMMM, yyyy',
ADD COLUMN IF NOT EXISTS time_format TEXT NOT NULL DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
