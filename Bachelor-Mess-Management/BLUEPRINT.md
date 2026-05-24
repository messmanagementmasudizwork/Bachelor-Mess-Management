# MessPilot — System Blueprint

> **Version:** 1.0.0 | **Platform:** Bachelor Mess Management SaaS (Bangladesh)
> **Created:** 2026-05-18 | **Status:** Production-Grade

---

## 1. Vision & Product Summary

MessPilot is a multi-tenant SaaS platform for managing bachelor mess operations in Bangladesh. It enables mess owners, admins, managers, and members to collaboratively track meals, expenses, deposits, inventory, and communications — all in real-time with Bengali-first UI.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 15+ |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Backend | Supabase (Auth, DB, Storage, Realtime) | Latest |
| Database | PostgreSQL via Supabase | Latest |
| State | TanStack Query v5 + Zustand v5 | Latest |
| Forms | React Hook Form + Zod | Latest |
| Charts | Recharts | Latest |
| PDF | jsPDF | Latest |
| Push | Web Push API + VAPID | Native |
| Runtime | Node.js | 20.x |
| Package Manager | npm | 10.x |

---

## 3. Architecture Overview

```
Bachelor-Mess-Management/
├── app/                         ← Next.js App Router
│   ├── (auth)/                  ← Auth route group (login, register, forgot-password)
│   ├── (dashboard)/             ← Protected dashboard routes
│   │   ├── page.tsx             ← Main dashboard
│   │   ├── meals/               ← Meal management
│   │   ├── expenses/            ← Expense tracking
│   │   ├── bazaar/              ← Bazaar/grocery management
│   │   ├── deposits/            ← Deposit & wallet system
│   │   ├── members/             ← Member management
│   │   ├── reports/             ← Reports & analytics
│   │   ├── manager/             ← Manager rotation
│   │   ├── notifications/       ← Notification center
│   │   ├── inventory/           ← Inventory tracking
│   │   ├── settings/            ← User & mess settings
│   │   ├── permissions/         ← 3-layer permission system
│   │   ├── audit/               ← Audit log viewer
│   │   ├── chat/                ← Group chat + DMs
│   │   ├── notices/             ← Notice board
│   │   ├── menu/                ← Weekly menu management
│   │   ├── polls/               ← Voting & polls
│   │   ├── complaints/          ← Complaint management
│   │   ├── gamification/        ← Leaderboard & badges
│   │   └── super-admin/         ← Super admin panel
│   ├── api/                     ← Server-side API routes
│   │   └── push/                ← Web Push subscribe/send
│   ├── auth/callback/           ← Supabase SSR auth callback
│   ├── join/                    ← Join mess via invite code/QR
│   └── mess/                    ← Mess management page
├── components/                  ← React components
│   ├── ui/                      ← Base UI (shadcn style)
│   ├── layout/ (layoutmess/)    ← Header, Sidebar, MobileNav
│   ├── shared/                  ← Reusable feature-agnostic
│   ├── meals/                   ← Meal components
│   ├── members/                 ← Member components
│   └── reports/                 ← Report components
├── lib/                         ← Business logic layer
│   ├── supabase/                ← Supabase client configs + DB types
│   ├── types/                   ← TypeScript interfaces
│   ├── validations/             ← Zod schemas
│   ├── services/                ← Data access (19 service files)
│   ├── hooks/                   ← React Query custom hooks
│   ├── stores/                  ← Zustand state stores
│   └── utils/                   ← Pure utility functions
├── supabase/migrations/         ← SQL migration files (001–012)
├── public/                      ← Static assets + service worker
└── scripts/                     ← Utility scripts
```

---

## 4. Database Schema (13 Core Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (linked to auth.users) |
| `messes` | Mess tenant (multi-tenant root) |
| `mess_members` | Member-mess relationship + role |
| `meals` | Daily meal records per member |
| `expenses` | Expense entries (variable/fixed) |
| `bazaar_entries` | Bazaar/grocery entries (linked to expenses) |
| `deposits` | Member deposits/payments |
| `manager_history` | Manager assignment audit trail |
| `inventory` | Mess inventory items |
| `notifications` | In-app notifications |
| `audit_logs` | Financial audit log (partitioned by year) |
| `messages` | Group chat + notices + events |
| `polls` / `poll_votes` | Voting system |

### Additional Tables (Migrations 004–012)
- `complaints` — Complaint & maintenance tickets
- `menus` — Weekly menu management
- `direct_messages` — Manager DM system
- `push_subscriptions` — Web Push subscriptions
- `role_permission_presets` — Global permission defaults
- `mess_role_permissions` — Per-mess role overrides
- `member_permissions` — Per-member permission overrides

### Database Views
- `member_balances` — Real-time balance per member
- `daily_meal_summary` — Today's meal totals
- `monthly_expense_summary` — Monthly aggregated expenses

### Database Functions
- `calculate_meal_rate(mess_id, month)` — Meal rate calculation
- `close_month(mess_id, month)` — Month closing workflow
- `get_member_balance(mess_id, member_id, month)` — Balance lookup
- `join_mess_by_invite(invite_code)` — Invite code join
- `generate_invite_code()` — Unique code generator
- `resolve_permission(user_id, mess_id, perm_key)` — 3-layer permission resolver
- RLS helpers: `is_mess_member`, `is_mess_admin`, `is_mess_manager`, `get_user_role_in_mess`

---

## 5. Security Architecture

- **Row Level Security (RLS)** — Enabled on ALL 13+ tables, 32+ policies
- **Multi-tenant isolation** — All queries scoped by `mess_id`
- **RBAC** — 6 roles: owner, admin, manager, assistant_manager, member, guest
- **3-Layer Permission System** — Global presets → Mess-level overrides → Member-level overrides
- **Financial audit trail** — All expense/deposit changes logged to `audit_logs`
- **Month locking** — Closed months cannot be edited
- **Never hardcode secrets** — All credentials via Replit Secrets / environment variables
- **Server-side validation** — Never trust frontend-only validation

---

## 6. Financial Calculation Rules

```
Meal Rate      = Total Variable Expense / Total Meals
Member Cost    = (Member Meals × Meal Rate) + Fixed Share + Guest Charges + Late Penalties
Balance        = Total Deposited - Total Cost
Carry-forward  = Previous month balance applied to current month
```

- All monetary values stored as `NUMERIC(12,2)` (never FLOAT)
- All financial operations create audit log entries
- Month close is **irreversible** — triggers auto-manager-rotation if configured

---

## 7. Feature Modules (All Completed ✅)

| Module | Key Features |
|--------|-------------|
| Auth | Email/password, forgot-password, account lockout, login history |
| Mess Management | Create/join/QR code, settings, avatar upload, invite code |
| Member Management | Roles, leave, seat numbers, profile, due tracking |
| Meal Management | Daily ON/OFF, calendar, cutoff rules, guest meals, bulk update |
| Bazaar | Itemized entries, price history, receipt upload |
| Expenses | Variable/fixed, approval workflow, category charts |
| Deposits | Confirmation workflow, partial payment, carry-forward |
| Reports | Member reports, PDF/CSV export, charts, budget insights |
| Dashboard | Live stats, realtime updates, member/admin views |
| Notifications | In-app + web push, realtime, due/low balance alerts |
| Inventory | Item tracking, low stock alerts, usage log |
| Manager System | Rotation, history, handover notes, auto-rotation |
| Permissions | 3-layer RBAC, per-mess/per-member overrides, permission matrix UI |
| Menu | Weekly menu, special/festival tags, budget constraints |
| Communication | Group chat, DMs, notice board, events, voice messages |
| Polls | Anonymous voting, time-limited, results dashboard |
| Complaints | Priority system, ticket tracking, media upload |
| Gamification | Leaderboard, badges, achievement system |
| Audit | Full financial audit trail, activity log |
| Super Admin | Platform management, subscription plans |

---

## 8. Environment Configuration

```bash
# Required Replit Secrets (already configured)
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=         # Server-only (never expose to client)
SUPABASE_DB_PASSWORD=              # DB password
SUPABASE_CONNECTION_STRING=        # Direct DB connection string
```

---

## 9. Running the Application

```bash
# Workflow: "Start application"
cd Bachelor-Mess-Management && npm run dev
# Runs on port 5000
```

---

## 10. Deployment & Migration Notes

- All 12+ SQL migrations must be applied to Supabase before first run
- Migration files: `supabase/migrations/001_*.sql` through `012_*.sql`
- Storage buckets required: `avatars`, `mess-logos`, `receipts`, `media`
- VAPID keys required for web push (stored as Replit Secrets)
- Supabase Realtime must be enabled for the tables used by subscriptions

---

## 11. Architectural Decisions & Constraints

1. **Monolith-first** — Single Next.js app, no microservices
2. **Supabase-only backend** — No custom API server outside of Next.js API routes
3. **Service layer mandatory** — Components never call Supabase directly
4. **Bengali UI primary** — All user-facing text in Bengali first
5. **Mobile-first** — All layouts tested at 375px+ widths
6. **Soft deletes only** — Records use status fields, never `DELETE`
7. **UUID primary keys** — All tables use `uuid_generate_v4()`
8. **No floating-point money** — `NUMERIC(12,2)` everywhere

---

*Last updated: 2026-05-18 — Post clone setup and environment validation*
