# MessPilot — Bachelor Mess Management Platform

---

## ⛔ PLAN-FIRST RULE — সবচেয়ে গুরুত্বপূর্ণ নিয়ম (NON-NEGOTIABLE)

**User approval ছাড়া কোনো code লেখা বা file edit করা যাবে না।**

```
❌ NEVER implement/code/edit anything without user approval first
❌ NEVER assume what the user wants — always confirm
✅ ALWAYS show a written plan to the user BEFORE writing any code
✅ ALWAYS wait for the user to say "হ্যাঁ" / "ok" / "approved" / "করো"
✅ ONLY then start implementing

Plan format (must include):
  - কী কী change করব (exact files + what will change)
  - কী কী unchanged থাকবে
  - কোনো side-effect আছে কিনা
```

**যদি কোনো কিছু নিজে ঠিক করার দরকার হয় → plan লিখে user-এর approval নাও, তারপর করো।**

---

## ✅ প্রতিটি কাজ শুরুর আগে বাধ্যতামূলক

```
1. replit.md সম্পূর্ণ পড়ুন (এটাই — automatically load হয়)
2. প্রাসঙ্গিক existing code পড়ুন — কখনো অনুমান করবেন না
3. Desktop ও Mobile — দুটোতেই একসাথে change করুন
4. Shared config/util থেকে কাজ করুন — duplicate করবেন না
5. PLAN দেখাও → approval নাও → তারপর implement করো
```

---

## Project Overview

A production-grade SaaS platform for managing bachelor mess operations in Bangladesh. Built with Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

---

## Architecture

- **Framework**: Next.js 15 App Router (TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Auth, PostgreSQL, RLS, Realtime, Storage)
- **State Management**: TanStack Query v5 + Zustand v5
- **Forms**: React Hook Form + Zod validation
- **Language Support**: Bengali (বাংলা) primary, English secondary

---

## Project Structure

```
app/                      ← Next.js App Router (ROOT level)
├── (auth)/               ← Auth pages (login, register)
├── (dashboard)/          ← Protected dashboard pages
│   ├── meals/
│   ├── expenses/
│   ├── bazaar/
│   ├── deposits/
│   ├── members/
│   ├── reports/
│   ├── settings/
│   └── ...
├── api/                  ← API routes (server-side only)
└── layout.tsx

components/               ← ROOT level — এটাই REAL app
├── ui/                   ← Base UI (shadcn style)
├── layout/               ← App layout components ← এখানেই সব change করতে হবে
│   ├── Sidebar.tsx           ← Desktop sidebar (REAL file — এখানেই edit করতে হবে)
│   ├── MobileNav.tsx         ← Mobile nav (REAL file — এখানেই edit করতে হবে)
│   └── nav.config.ts         ← সব nav item এখানে define হবে
├── shared/               ← Reusable feature-agnostic components
├── meals/                ← Meal components
└── ...

lib/                      ← Business logic layer
├── supabase/             ← Supabase client configs
├── types/                ← TypeScript interfaces
├── validations/          ← Zod schemas
├── services/             ← Business logic (NO DB in components)
├── hooks/                ← React Query hooks
├── stores/               ← Zustand state stores
└── utils/                ← Pure utility functions

supabase/
├── migrations/           ← SQL migration files
└── functions/            ← Edge Functions
```

---

## Technology Stack (MANDATORY)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase ONLY |
| Database | PostgreSQL via Supabase |
| State | TanStack Query + Zustand |
| Forms | React Hook Form + Zod |
| Auth | Supabase Auth |

---

## Core Identity

You are acting as:
- Senior Full Stack Engineer
- Senior SaaS Architect
- Senior Product Engineer
- Senior Database Architect
- Startup CTO mindset

**Every output must be:** Production-grade | Scalable | Secure | Maintainable | Modular | Clean | Reusable

---

## Navigation & UI Consistency Rules (CRITICAL)

### ⚠️ Desktop ও Mobile সবসময় একসাথে

```
❌ WRONG: Desktop Sidebar-এ কিছু যোগ করা — Mobile-এ না করা
❌ WRONG: Mobile Nav-এ কিছু যোগ করা — Desktop-এ না করা
✅ CORRECT: nav.config.ts-এ change করা — দুটো automatically সিঙ্ক হয়
```

**Navigation-এর নিয়ম:**
- সব nav item definition এবং permission `components/layout/nav.config.ts`-এ থাকবে
- `Sidebar.tsx` এবং `MobileNav.tsx` — দুটোই শুধু `nav.config.ts` থেকে import করবে
- কোনো nav item কখনো দুই জায়গায় hardcode করা যাবে না

### Role Hierarchy (owner সর্বোচ্চ)

| Role | বাংলা | দেখতে পাবে |
|------|-------|-----------|
| `owner` | মালিক (সুপার অ্যাডমিন) | সব কিছু |
| `admin` | অ্যাডমিন | সব কিছু |
| `manager` | ম্যানেজার | বাজার, খরচ, সদস্য, ইনভেন্টরি, রিপোর্ট |
| `assistant_manager` | সহকারী ম্যানেজার | বাজার, রিপোর্ট |
| `member` | সদস্য | রিপোর্ট |
| `guest` | অতিথি | শুধু হোম, মিল, নোটিফিকেশন, অ্যাকাউন্ট |

### Role-Based Navigation — Correct Pattern

```typescript
// ✅ CORRECT: shared canSeeNavItem() function ব্যবহার করুন
import { canSeeNavItem, mainNavItems } from "./nav.config";
const visible = allItems.filter(item => canSeeNavItem(item, role));

// ❌ WRONG: একই role check দুই জায়গায়
// Sidebar-এ:   role === "owner" && ...
// MobileNav-এ: role === "owner" && ...  ← duplicate!
```

---

## Component Rules

```tsx
// ✅ CORRECT: Service layer separation
const { data } = useMonthlyMeals(); // hook calls service
service.getMonthlyMeals(messId, month); // service calls Supabase

// ❌ WRONG: Direct DB access in component
const { data } = await supabase.from('meals').select('*'); // in component!
```

- Never call Supabase directly from components
- Use custom hooks for all data fetching
- Loading states for every async operation
- Error boundaries for all critical sections
- Empty states when data is missing
- Giant components নিষেধ (max ~200 lines)

---

## Shared Config Pattern (MANDATORY)

```
✅ একটি shared file বানাও (e.g., nav.config.ts, roles.config.ts)
✅ সব component সেখান থেকে import করো
❌ কখনো একই data দুই জায়গায় hardcode করো না
```

উদাহরণ:
- `nav.config.ts` → Sidebar + MobileNav
- `member.types.ts` → ROLE_PERMISSIONS সব জায়গায়
- `permissions.ts` → সব role check একজায়গায়

---

## Security Rules (NON-NEGOTIABLE)

- ✅ **RLS on EVERY table** — no exceptions
- ✅ **RBAC system** — role-based access control
- ✅ **Validate server-side** — never trust frontend
- ✅ **Audit logs** for all financial operations
- ✅ **Session management** via Supabase Auth
- ✅ **Financial locking** — month close prevents edits
- ❌ Never expose raw database errors to users
- ❌ Never hardcode secrets

---

## Financial System Rules

```
Meal Rate  = Total Variable Expense / Total Meals
Member Cost = Member Meals × Meal Rate + Fixed Share
Balance    = Total Deposited - Total Cost
```

- Use `NUMERIC(12,2)` for all money columns (never FLOAT)
- All financial changes must create audit entries
- Month close is irreversible
- Carry-forward balances to next month

---

## Database Rules

- UUID primary keys (`uuid_generate_v4()`)
- `snake_case` for all column names
- Soft deletes (status field, not DELETE)
- `created_at`, `updated_at`, `created_by` on all tables
- Composite indexes for common query patterns
- Foreign key constraints everywhere

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Folders | kebab-case | `mess-management/` |
| Components | PascalCase | `MealToggle.tsx` |
| Variables | camelCase | `mealRate` |
| DB columns | snake_case | `created_by` |
| Hooks | use prefix | `useMembers()` |
| Services | camelCase suffix | `mealService` |
| Query keys | CONSTANT_CASE | `MEAL_KEYS` |

---

## Error Handling Pattern

```typescript
// Service layer
async function createExpense(input) {
  const { data, error } = await supabase.from('expenses').insert(input);
  if (error) throw new Error(error.message);
  return data;
}

// Hook layer
const mutation = useMutation({
  mutationFn: createExpense,
  onError: (error: Error) => toast.error(error.message),
});
```

---

## UI/UX Standards

- Mobile-first responsive design
- Bengali language support (`font-bengali` class)
- Minimum touch target: 44×44px
- Loading skeletons (not spinners) for content
- Toast notifications via `sonner`
- No raw error messages shown to users
- Empty states with actionable CTAs

---

## Supabase Usage Checklist

নতুন feature-এর আগে:
- [ ] RLS policy defined?
- [ ] Indexes added for query patterns?
- [ ] Audit log trigger created?
- [ ] Type-safe with `database.types.ts`?
- [ ] Edge Function needed for business logic?
- [ ] Realtime subscription needed?
- [ ] Foreign key constraints defined?

---

## ❌ DO NOT List

```
❌ Microservices architecture (monolith first)
❌ Floating-point money (use NUMERIC)
❌ Raw SQL in components
❌ Hardcoded secrets or API keys
❌ Skip RLS on any table
❌ Skip audit logs for financial ops
❌ Skip TypeScript types
❌ Giant components (max ~200 lines)
❌ Duplicate business logic
❌ Inconsistent error handling
❌ Desktop-এ change করে Mobile-এ না করা (বা উল্টো)
❌ একই nav item দুই জায়গায় hardcode করা
❌ Role-based filtering শুধু একটি view-এ করা
❌ Plan ছাড়া code লেখা
❌ User approval ছাড়া কিছু implement করা
```

---

## Key Features

- Multi-tenant mess management (each mess is isolated)
- RBAC: owner (সুপার অ্যাডমিন), admin, manager, assistant_manager, member, guest
- Daily meal ON/OFF toggle with cutoff time rules
- Bazaar/expense tracking with variable & fixed split
- Deposit/wallet system per member
- Monthly report with auto-calculated meal rate
- Realtime updates via Supabase
- Bengali UI with full mobile support

---

## Setup Instructions

1. Copy `.env.local.example` to `.env.local`
2. Add Supabase credentials (URL + anon key)
3. Run SQL migrations in Supabase dashboard
4. The app will be fully functional

---

## ⚠️ Pending SQL Migrations (Agent must run these)

নতুন কোনো schema migration file (`supabase/migrations/`) তৈরি হলে agent-কে অবশ্যই সেটি Supabase-এ run করতে হবে। Migration run করার নিয়ম:

```javascript
// code_execution tool-এ এই script চালাও:
const { Client } = await import('pg');
const fs = await import('fs');
const sql = fs.readFileSync('/home/runner/workspace/supabase/migrations/XXX_file.sql', 'utf8');
const client = new Client({ connectionString: process.env.SUPABASE_CONNECTION_STRING });
await client.connect();
try { await client.query(sql); console.log('✅ Done'); }
catch (err) { console.error('❌', err.message); }
finally { await client.end(); }
```

### ✅ Run করা হয়েছে
| Migration | তারিখ | বিবরণ |
|---|---|---|
| `001_initial_schema.sql` | (initial) | Core schema |
| `002_rls_policies.sql` | (initial) | RLS policies |
| `003_functions_triggers.sql` | (initial) | Functions & triggers |
| `004` – `023` | (initial) | Feature migrations |
| `024_mess_settings_table.sql` | 2026-05-21 | `mess_settings` typed table |
| `025_cutoff_time_mode.sql` | 2026-05-21 | Add `cutoff_time_mode`, rename `cutoff_advance_time` → `cutoff_single_time` |
| `026_meals_vacation_id.sql` | 2026-05-23 | `vacation_id` column on `meals` table for vacation ownership tracking |
| `027_admin_notices.sql` | 2026-05-24 | `admin_notices` table — scheduled notice/meeting publishing system |
| `028_meeting_datetime.sql` | 2026-05-24 | `meeting_at`, reminder flags on `admin_notices` + `send_meeting_reminders()` pg_cron job |
| `029_notice_expiry.sql` | 2026-05-24 | `expires_at` column on `admin_notices` + `auto_expire_meetings()` pg_cron hourly job |
| `030_add_admin_notice_type.sql` | 2026-05-24 | Add `admin_notice` to `notification_type` ENUM — fixes notice/meeting bell notifications |
| `031_profile_work_room_fields.sql` | 2026-05-24 | Add `company`, `department`, `designation`, `job_joining_date`, `job_id_card_no` to `profiles`; add `building`, `floor_number`, `room_number` to `mess_members` |
| `007_storage_buckets.sql` (re-run) | 2026-05-25 | Created 4 storage buckets (`avatars`, `mess-logos`, `receipts`, `media`) + 14 RLS policies — was missing, causing "Bucket not found" on photo upload |
| `032_pin_hash.sql` | 2026-05-25 | Add `pin_hash TEXT` column to `profiles` + 4 RPC functions (`set_action_pin`, `verify_action_pin`, `remove_action_pin`, `is_action_pin_set`) using `pgcrypto` bcrypt — Security PIN now saves to Supabase instead of localStorage-only |
| `033_mess_settings_add_columns.sql` | 2026-05-25 | Add `frozen_months TEXT[]` + `due_reminder_days INT[]` to `mess_settings` table — migrated from `messes.settings` JSONB; Edge Functions now read these from `mess_settings` |
| `034_drop_messes_settings_column.sql` | 2026-05-25 | DROP `messes.settings` JSONB column — fully replaced by `mess_settings` typed table; all code (Next.js + Edge Functions) migrated to `mess_settings` only |

## Running the App

The workflow `Start application` runs: `npm run dev` (port 5000)

---

## User Preferences

- English is the primary UI language
- Mobile-first responsive design
- All financial amounts display in BDT (৳)
- Supabase is the only backend (no custom API server)
- Desktop ও Mobile-এ সবসময় same feature/menu থাকবে — কোনো inconsistency নয়
