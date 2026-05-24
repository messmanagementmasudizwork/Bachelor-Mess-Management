-- ============================================================
-- MIGRATION: 014_platform_settings
-- Platform-wide settings + Subscription Plans
-- ============================================================

-- ============================================================
-- TABLE: platform_settings
-- Key-value store for platform configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Super admin can read and write
CREATE POLICY "sa_read_platform_settings"
  ON platform_settings FOR SELECT
  USING (is_super_admin());

CREATE POLICY "sa_write_platform_settings"
  ON platform_settings FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Seed default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode',        'false', 'প্ল্যাটফর্ম মেইন্টেন্যান্স মোডে আছে কিনা'),
  ('allow_new_registrations', 'true',  'নতুন রেজিস্ট্রেশন অনুমোদিত কিনা'),
  ('allow_new_messes',        'true',  'নতুন মেস তৈরি অনুমোদিত কিনা'),
  ('enable_ai_features',      'false', 'AI ফিচার চালু আছে কিনা'),
  ('enable_realtime',         'true',  'Realtime আপডেট চালু আছে কিনা'),
  ('enable_push_notifications','true', 'Push notifications চালু আছে কিনা'),
  ('max_members_per_mess',    '50',    'প্রতি মেসে সর্বোচ্চ সদস্য সংখ্যা'),
  ('max_messes_per_user',     '5',     'প্রতি ইউজারের সর্বোচ্চ মেস সংখ্যা'),
  ('platform_version',        '1.0.0', 'বর্তমান প্ল্যাটফর্ম ভার্সন'),
  ('support_email',           'support@messpilot.com', 'সাপোর্ট ইমেইল')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TABLE: subscription_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  price_monthly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_members    INTEGER,
  max_messes     INTEGER,
  features       TEXT[] NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_plans"
  ON subscription_plans FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sa_manage_plans"
  ON subscription_plans FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Seed default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_members, max_messes, features) VALUES
  ('ফ্রি', 'free', 0, 0, 20, 1,
    ARRAY['মিল ট্র্যাকিং', 'খরচ ব্যবস্থাপনা', 'জমা ব্যবস্থাপনা', 'মাসিক রিপোর্ট', 'মোবাইল অ্যাপ']),
  ('প্রো', 'pro', 299, 2990, 100, 3,
    ARRAY['ফ্রি-র সব ফিচার', 'অ্যাডভান্সড রিপোর্ট', 'CSV/PDF এক্সপোর্ট', 'রিয়েলটাইম আপডেট', 'পুশ নোটিফিকেশন', 'AI সহায়তা', 'প্রায়রিটি সাপোর্ট']),
  ('এন্টারপ্রাইজ', 'enterprise', 999, 9990, NULL, NULL,
    ARRAY['প্রো-র সব ফিচার', 'আনলিমিটেড সদস্য', 'আনলিমিটেড মেস', 'হোয়াইট লেবেল', 'কাস্টম ডোমেইন', 'ডেডিকেটেড সাপোর্ট', 'SLA গ্যারান্টি'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABLE: mess_subscriptions (future use)
-- ============================================================
CREATE TABLE IF NOT EXISTS mess_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES subscription_plans(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mess_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_subscription"
  ON mess_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messes m
      WHERE m.id = mess_id AND m.owner_id = auth.uid()
    )
  );

CREATE POLICY "sa_manage_subscriptions"
  ON mess_subscriptions FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Default all existing messes to free plan
INSERT INTO mess_subscriptions (mess_id, plan_id, status)
SELECT m.id, sp.id, 'active'
FROM messes m
CROSS JOIN subscription_plans sp
WHERE sp.slug = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM mess_subscriptions ms WHERE ms.mess_id = m.id
  );
