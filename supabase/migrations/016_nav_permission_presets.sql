-- ============================================================
-- Migration 016: Navigation visibility permission presets
-- ============================================================
-- Adds nav.* permission keys to role_permission_presets so that
-- the permissions management page can show and control which
-- sidebar pages are visible per role.
-- ============================================================

INSERT INTO role_permission_presets (role, permission_key, allowed) VALUES
  -- Owner: all nav pages visible
  ('owner', 'nav.bazaar',       true),
  ('owner', 'nav.expenses',     true),
  ('owner', 'nav.deposits',     true),
  ('owner', 'nav.members',      true),
  ('owner', 'nav.reports',      true),
  ('owner', 'nav.inventory',    true),
  ('owner', 'nav.kitchen',      true),
  ('owner', 'nav.menu',         true),
  ('owner', 'nav.polls',        true),
  ('owner', 'nav.complaints',   true),
  ('owner', 'nav.chat',         true),
  ('owner', 'nav.notices',      true),
  ('owner', 'nav.gamification', true),

  -- Admin: all nav pages visible
  ('admin', 'nav.bazaar',       true),
  ('admin', 'nav.expenses',     true),
  ('admin', 'nav.deposits',     true),
  ('admin', 'nav.members',      true),
  ('admin', 'nav.reports',      true),
  ('admin', 'nav.inventory',    true),
  ('admin', 'nav.kitchen',      true),
  ('admin', 'nav.menu',         true),
  ('admin', 'nav.polls',        true),
  ('admin', 'nav.complaints',   true),
  ('admin', 'nav.chat',         true),
  ('admin', 'nav.notices',      true),
  ('admin', 'nav.gamification', true),

  -- Manager: all nav pages visible
  ('manager', 'nav.bazaar',       true),
  ('manager', 'nav.expenses',     true),
  ('manager', 'nav.deposits',     true),
  ('manager', 'nav.members',      true),
  ('manager', 'nav.reports',      true),
  ('manager', 'nav.inventory',    true),
  ('manager', 'nav.kitchen',      true),
  ('manager', 'nav.menu',         true),
  ('manager', 'nav.polls',        true),
  ('manager', 'nav.complaints',   true),
  ('manager', 'nav.chat',         true),
  ('manager', 'nav.notices',      true),
  ('manager', 'nav.gamification', true),

  -- Assistant Manager: all except Members page
  ('assistant_manager', 'nav.bazaar',       true),
  ('assistant_manager', 'nav.expenses',     true),
  ('assistant_manager', 'nav.deposits',     true),
  ('assistant_manager', 'nav.members',      false),
  ('assistant_manager', 'nav.reports',      true),
  ('assistant_manager', 'nav.inventory',    true),
  ('assistant_manager', 'nav.kitchen',      true),
  ('assistant_manager', 'nav.menu',         true),
  ('assistant_manager', 'nav.polls',        true),
  ('assistant_manager', 'nav.complaints',   true),
  ('assistant_manager', 'nav.chat',         true),
  ('assistant_manager', 'nav.notices',      true),
  ('assistant_manager', 'nav.gamification', true),

  -- Member: limited pages (no bazaar/expenses/deposits/members/inventory)
  ('member', 'nav.bazaar',       false),
  ('member', 'nav.expenses',     false),
  ('member', 'nav.deposits',     false),
  ('member', 'nav.members',      false),
  ('member', 'nav.reports',      true),
  ('member', 'nav.inventory',    false),
  ('member', 'nav.kitchen',      true),
  ('member', 'nav.menu',         true),
  ('member', 'nav.polls',        true),
  ('member', 'nav.complaints',   true),
  ('member', 'nav.chat',         true),
  ('member', 'nav.notices',      true),
  ('member', 'nav.gamification', true),

  -- Guest: minimal pages
  ('guest', 'nav.bazaar',       false),
  ('guest', 'nav.expenses',     false),
  ('guest', 'nav.deposits',     false),
  ('guest', 'nav.members',      false),
  ('guest', 'nav.reports',      false),
  ('guest', 'nav.inventory',    false),
  ('guest', 'nav.kitchen',      false),
  ('guest', 'nav.menu',         false),
  ('guest', 'nav.polls',        true),
  ('guest', 'nav.complaints',   true),
  ('guest', 'nav.chat',         true),
  ('guest', 'nav.notices',      true),
  ('guest', 'nav.gamification', true)

ON CONFLICT (role, permission_key) DO NOTHING;
