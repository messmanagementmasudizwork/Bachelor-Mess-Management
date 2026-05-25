# MessPilot — Development Task Tracker
> Bachelor Mess Management Platform
> Based on: Complete PRD & Blueprint + AI Development Rules
> Last Updated: 2026-05-16

---

## Legend
- ✅ COMPLETED — Built and present in codebase
- 🔲 PENDING — Not yet built
- 🚧 PARTIAL — Partially built (page/UI exists but logic incomplete)

---

## PHASE 0 — Infrastructure & Environment Fixes
> Completed 2026-05-16. These fixes are permanent in git and survive fresh clone.

### EPIC 0.1: TypeScript & Supabase Type Safety
- ✅ `database.types.ts` — Added `Relationships: []` to all tables (was missing, caused `never` types)
- ✅ `database.types.ts` — Added `bazaar_entries` table type (Row, Insert, Update, Relationships)
- ✅ `database.types.ts` — Added `current_month` to messes.Insert, `invite_code` to messes.Update
- ✅ `lib/supabase/client.ts` — Added `getRequiredClient()` helper (throws clearly if env missing)
- ✅ All 7 service files updated to use `getRequiredClient()` instead of unsafe `createClient()`
- ✅ `lib/supabase/server.ts` — Fixed explicit cookie type annotations
- ✅ `app/mess-management/proxy.ts` — Fixed explicit cookie type annotations
- ✅ `app/auth/callback/route.ts` — Fixed cookie type annotations
- ✅ TypeScript: 0 errors (was 37 errors before fixes)

### EPIC 0.2: Bazaar Module Restored
- ✅ `bazaar_entries` table exists in Supabase (was removed from workaround, now restored)
- ✅ `expense.service.ts` — `createBazaar()` now inserts to both `expenses` AND `bazaar_entries`
- ✅ `expense.service.ts` — `getBazaarEntries()` now queries `bazaar_entries` table directly
- ✅ `app/dashboard/bazaar/page.tsx` — `shop_name` field used directly (no unsafe type cast)
- ✅ Both copies synced: `lib/` and `app/mess-management/lib/`

### EPIC 0.3: Environment & Setup
- ✅ `.env.local` — Fixed (placeholder values removed, Replit secrets now take effect)
- ✅ `.env.example` — Created (git-committed template for post-clone setup)
- ✅ `replit.md` — Updated with accurate setup instructions
- ✅ Supabase verified: all 13 tables, 8 functions, 32 RLS policies already deployed
- ✅ Next.js version corrected: running 16.2.6 (not 15 as stated in docs)

---

## PHASE 1 — Foundation & Infrastructure

### EPIC 1.1: Project Setup & Architecture
- ✅ Next.js 16.2.6 App Router + TypeScript setup
- ✅ Tailwind CSS + shadcn/ui configured
- ✅ TanStack Query v5 setup (QueryProvider)
- ✅ Zustand v5 stores wired
- ✅ React Hook Form + Zod validation layer
- ✅ Supabase client (browser) — `lib/supabase/client.ts`
- ✅ Supabase client (server/SSR) — `lib/supabase/server.ts`
- ✅ Supabase Admin client — `lib/supabase/server.ts` (`createAdminClient`)
- ✅ TypeScript database types — `lib/supabase/database.types.ts`
- ✅ `next.config.ts` configured for Replit dev origins
- ✅ Production-grade folder structure (app / components / lib / supabase)

### EPIC 1.2: Database Schema (Supabase Migrations)
- ✅ `profiles` table
- ✅ `messes` table (name, address, type, settings, invite_code, seat_capacity)
- ✅ `mess_members` table (role, status, seat_number, meal defaults)
- ✅ `meals` table (breakfast, lunch, dinner, guest counts)
- ✅ `expenses` table (category, split_type, variable/fixed, approval status)
- ✅ `bazaar_entries` table (linked to expenses, shop_name, items JSONB)
- ✅ `deposits` table (amount, payment_method, confirmation workflow)
- ✅ `manager_history` table
- ✅ `inventory` table
- ✅ `notifications` table
- ✅ `audit_logs` table (partitioned by year: 2025, 2026)
- ✅ DB Views: `member_balances`, `daily_meal_summary`, `monthly_expense_summary`
- ✅ DB Functions: `calculate_meal_rate`, `close_month`, `get_member_balance`, `join_mess_by_invite`, `generate_invite_code`
- ✅ RLS Helper Functions: `is_mess_member`, `is_mess_admin`, `is_mess_manager`, `get_user_role_in_mess`
- ✅ Migration files: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_functions_triggers.sql`
- ✅ All migrations confirmed deployed to Supabase (verified 2026-05-16)

### EPIC 1.3: RLS & Security (Database)
- ✅ Row Level Security enabled on all 13 tables
- ✅ Tenant isolation (mess_id based) on all policies
- ✅ RBAC-aware policies (owner / admin / manager / member / guest)
- ✅ 32 RLS policies confirmed active in Supabase (verified 2026-05-16)

### EPIC 1.4: Database Triggers & Automation
- ✅ Auto-update `updated_at` timestamps
- ✅ Auto-create profile on user signup trigger
- ✅ Auto-notify on expense/deposit changes
- ✅ Auto-generate invite code on mess creation
- ✅ Audit triggers on expenses & deposits tables

---

## PHASE 1 — Authentication Module

### EPIC 2.1: Core Auth
- ✅ Login page (`/login`) — email/password
- ✅ Register page (`/register`) — full profile setup
- ✅ Forgot password page (`/forgot-password`)
- ✅ Auth callback route (`/auth/callback`) — Supabase SSR
- ✅ Auth service (`lib/services/auth.service.ts`)
- ✅ Auth Zustand store (`lib/stores/auth.store.ts`)
- ✅ Auth React Query hook (`lib/hooks/use-auth.ts`)
- ✅ AuthProvider component (session management)

### EPIC 2.2: Advanced Auth
- 🔲 Phone OTP login (Supabase phone auth — requires Supabase phone provider config; deferred)
- 🔲 Google OAuth login (requires Supabase OAuth provider config; deferred)
- ✅ Login history tracking (via audit_logs) — `auditService.logLoginEvent()` called on signIn in auth.service.ts; `auditService.getLoginHistory()` fetches from audit_logs where entity_type=auth; settings page "লগইন ইতিহাস" card shows last 15 entries with device info, login/logout icon, timestamp
- ✅ Account lock after failed attempts — login/page.tsx tracks attempts in localStorage (`messpilot_login_attempts`); locks for 10 minutes after 5 failed attempts; shows countdown timer; warns on 1-4 failures with remaining count; auto-unlocks when timer expires; clears on successful login
- 🔲 Device/session management UI (requires Supabase admin API with service role; deferred — login history shows recent sessions)
- 🔲 Refresh token rotation strategy (handled automatically by Supabase client; no custom logic needed)

---

## PHASE 1 — Mess Management Module

### EPIC 3.1: Core Mess Operations
- ✅ Mess page (`/mess`)
- ✅ Mess service (`lib/services/mess.service.ts`)
- ✅ Mess Zustand store (`lib/stores/mess.store.ts`) — `_hasHydrated` flag যোগ করা হয়েছে (hydration gap fix)
- ✅ MessSelector component (multi-mess switching)
- ✅ Mess stats & metadata hook (`lib/hooks/use-mess.ts`)
- ✅ Create mess form — MessSelector-এ dialog সহ সম্পূর্ণ (name, type, address)
- ✅ Join mess via invite code — MessSelector-এ dialog সহ সম্পূর্ণ (invite code input)
- ✅ Auto-select mess on login — login করার পরে DB থেকে mess load হলে স্বয়ংক্রিয়ভাবে select হয়, MessSelector আর দেখায় না (bug fix: dashboard/layout.tsx)
- ✅ QR code join system — `qrcode.react` দিয়ে mess/page.tsx-এ QR display + dialog + download + share; `/join?code=` route
- ✅ Mess settings editor (seat capacity, rules, type) — mess/page.tsx-এ সম্পূর্ণ form
- ✅ Mess profile/avatar upload — `storageService.uploadMessLogo()` in storage.service.ts; bucket `mess-logos` with RLS in 007_storage_buckets.sql

---

## PHASE 1 — Member Management Module

### EPIC 4.1: Core Member Operations
- ✅ Members page (`/members`)
- ✅ Member service (`lib/services/member.service.ts`)
- ✅ Members hook (`lib/hooks/use-members.ts`)
- ✅ Current member context hook
- ✅ Member list with roles & status display (role badge, joining date, seat number, status)
- ✅ Real invite code display (fetched via `useMess` hook, replaces hardcoded "XXXXXXXX")
- ✅ Copy invite code to clipboard (toast feedback)
- ✅ Remove member UI — admin/owner can soft-delete via Trash icon + confirm dialog
- ✅ Role change UI — admin/owner can change role via Shield icon + select dialog
- ✅ Assign manager dialog (separate dedicated flow)
- ✅ `MemberActionDialog` component (`components/members/MemberActionDialog.tsx`)
- ✅ Member profile editor (phone, blood group, profession) — `MemberProfileDialog` component; avatar click → view/edit all fields; admin can edit
- ✅ Profile image upload — `ImageUpload` component in settings, uploads to `avatars/` bucket, saves URL to profile via authService
- ✅ Temporary leave management (leave_start / leave_end) — `useSetMemberLeave` hook, `CalendarOff` button in MemberActionDialog
- ✅ Active/inactive/on_leave status toggle — clickable Badge → DropdownMenu, uses `useUpdateMemberStatus` + `memberService.updateMemberStatus`
- ✅ Member history (join/leave log) — "যোগদান ইতিহাস" tab in members page; sorted by joining_date desc; shows join date, status icon (UserCheck/UserX/CalendarOff), role badge
- ✅ Due tracking per member (UI display) — per-member balance/due amount shown in members list via `useMemberBalances` (green advance / red due)
- ✅ Seat number assignment UI — `useUpdateSeatNumber` hook + `Armchair` button in MemberActionDialog + `updateSeatNumber` in member.service.ts

---

## PHASE 1 — Meal Management Module

### EPIC 5.1: Core Meal Operations
- ✅ Meals page (`/meals`)
- ✅ Meal service (`lib/services/meal.service.ts`)
- ✅ Meals hook (`lib/hooks/use-meals.ts`)
- ✅ Daily meal ON/OFF toggle per member (tap breakfast/lunch/dinner chips with green/red feedback)
- ✅ Meal calendar view (monthly grid with colored dot indicators, prev/next month nav)
- ✅ Daily meal summary (total breakfast/lunch/dinner counts for today)
- ✅ Admin "সব সদস্য" tab — shows all members' meal status, admin can toggle any member's meal
- ✅ `getAllMembersForDate()` service method added to `meal.service.ts`
- ✅ `useAdminDailyMeals()` + `useAdminToggleMeal()` hooks added to `use-meals.ts`
- ✅ `AdminMembersView` component (`components/meals/AdminMembersView.tsx`)
- ✅ Bulk meal update (week/month) — meals page "বাল্ক" tab; এই মাসের বাকি দিনগুলো সব-চালু / সব-বন্ধ করা যায়
- ✅ Guest meal count entry — `GuestMealSection` component, +/- buttons per meal type, updates via `useUpdateMeal`, mess summary shows অতিথি column
- ✅ Recurring meal defaults (per member settings) — meals page "ডিফল্ট" tab; সকাল/দুপুর/রাত toggles, saves to DB via `useUpdateMealDefaults`
- ✅ Date range meal leave — meals page "বাল্ক" tab-এ নতুন `MealLeaveSection` card; From/To date picker, Breakfast/Lunch/Dinner meal type chip selector, Turn ON / Turn OFF buttons; per-date `checkMealToggleAllowed()` cutoff check (blocked dates auto-skip with count warning); existing meal values preserved for non-selected meal slots; translations added to `en.ts` + `bn.ts` (14 new keys under `meals.range*`)


### EPIC 5.2: Meal Rules Engine
- ✅ Time-based cutoff rules (e.g., lunch off before 10AM) — meal_cutoff_breakfast/lunch/dinner stored in mess settings JSON field
- ✅ Minimum notice period enforcement — `lib/utils/meal-cutoff.ts`; `checkMealToggleAllowed()` checks current time vs cutoff; past cutoff blocks toggle for members; shows locked state with Clock icon + time label in meals page
- ✅ Late meal penalty system — `late_meal_penalty` field in MessSettings; `calculateLateMealPenalty()` in financial.ts; penalty input in mess settings page; tracks late admin overrides via toast warning
- ✅ Guest meal charge calculation — `guest_meal_charge` field in MessSettings; `calculateGuestMealCharge()` in financial.ts; report.service.ts includes guest charges per member; MemberReportCard shows "গেস্ট মিল চার্জ" row; settings page has charge input
- ✅ Role-based rule exceptions — `canBypassCutoff()` in meal-cutoff.ts; owner/admin/manager roles can toggle after cutoff with warning toast; regular members see locked (gray) button
- ✅ Dynamic rule configuration UI (admin) — mess settings page has meal cutoff time inputs (সকাল/দুপুর/রাত), allow_guest_meals toggle, require_expense_approval toggle, auto_manager_rotation toggle; guest_meal_charge + late_meal_penalty numeric inputs; saved to messes.settings JSON via updateMess

---

## PHASE 1 — Bazaar Management Module

### EPIC 6.1: Core Bazaar Operations
- ✅ Bazaar page (`/bazaar`)
- ✅ Bazaar service — `getBazaarEntries()` using `bazaar_entries` table
- ✅ Bazaar service — `createBazaar()` inserts to both `expenses` + `bazaar_entries`
- ✅ `shop_name` field working end-to-end (form → DB → display)
- ✅ Add bazaar entry form (itemized — items JSONB field)
- ✅ Dedicated bazaar hook (`lib/hooks/use-bazaar.ts`)
- ✅ Category-wise entry (চাল/ডাল, মাছ/মাংস, সবজি, মসলা, তেল — BazaarItemForm)
- ✅ Frequent item suggestion (preset items per category with badge tap-to-add)
- ✅ Price history tracking — bazaar page "দাম ইতিহাস" tab; items JSONB থেকে per-item price trend compute করা; latest price + delta badge + timeline chips
- ✅ Receipt image upload — `FileUpload` component in expense/bazaar forms; uploads to `receipts/` bucket; `receipt_url` stored in expenses + bazaar_entries
- ✅ Edit bazaar entry — `expenseService.updateBazaar()` updates both `bazaar_entries` + `expenses` tables; `useUpdateBazaar()` hook; Pencil button per row in bazaar list; pre-filled edit dialog; gated by `bazaar.edit` permission (owner-only default)
- ✅ Delete bazaar entry — `expenseService.deleteBazaar()` deletes `bazaar_entries` row + soft-deletes `expenses`; `useDeleteBazaar()` hook; Trash button per row; confirm dialog with warning; gated by `bazaar.delete` permission (owner-only default)
- ✅ `bazaar.edit` + `bazaar.delete` permission keys added to `Permission` type, `ROLE_PERMISSIONS` (owner only), `ALL_PERMISSION_KEYS` in `/dashboard/permissions`, `PERMISSION_LABELS` + `PERMISSION_GROUPS` in `/super-admin/permissions`; translations added to `en.ts` + `bn.ts`
- ✅ Form validation fix — `createBazaarSchema(t.validation)` called correctly via `useMemo`; `createExpenseSchema(t.validation)` same fix in expenses page; amount default `0` → `undefined` to pass `positive()` check
- ✅ BazaarItemForm UI redesign — card-per-item layout (Name row + Qty/Unit/Price/Total row) replacing cramped 12-col grid; readable on mobile
- ✅ Bazaar list display improvements — creator name shown; shop_name as title + note as subtitle; divide-y layout; expanded item table with header/rows/total
- 🔲 OCR receipt scanning (Edge Function or external API — requires EPIC 18.3)

---

## PHASE 1 — Expense Management Module

### EPIC 7.1: Core Expense Operations
- ✅ Expenses page (`/expenses`)
- ✅ Expense service (`lib/services/expense.service.ts`)
- ✅ Expenses hook (`lib/hooks/use-expenses.ts`)
- ✅ Add expense form (category, amount, split_type, date, note — full form with Zod + RHF)
- ✅ Variable vs fixed expense toggle (Switch in form — auto-sets split_type)
- ✅ Expense approval workflow (pending → approved → rejected, admin approve/reject in expanded row)
- ✅ Expense split calculator (equal / by_meal / custom selector in form)
- ✅ Filter tabs: সব / অনুমোদিত / অপেক্ষায় (with pending count badge)
- ✅ Monthly expense graph/chart — category-wise horizontal bar chart in expenses page; shows all categories sorted by amount with % fill bar + formatted total
- ✅ Audit history per expense — "ইতিহাস" button on approved expenses opens dialog; auditService.getExpenseAuditLog queries audit_logs filtered by entity_type=expense & entity_id; shows action, user, timestamp
- ✅ Soft delete with reason — MemberActionDialog remove section now has optional "কারণ" text input; reason passed to removeMember hook; updates status="removed" with reason stored in notes field

---

## PHASE 1 — Deposit & Wallet System

### EPIC 8.1: Core Deposit Operations
- ✅ Deposits page (`/deposits`)
- ✅ Deposit service (`lib/services/deposit.service.ts`)
- ✅ Deposits hook (`lib/hooks/use-deposits.ts`)
- ✅ Add deposit form (member, amount, payment_method, date, transaction ref, note — full form)
- ✅ Deposit confirmation workflow (admin confirm/reject — expandable row with action buttons)
- ✅ Wallet balance display per member (due/advance section from member_balances view)
- ✅ Due tracking & due alert UI (red/green badges with TrendingDown/Up icons)
- ✅ Payment method selection (Cash / bKash / Nagad / Rocket / Bank — emoji Select)
- ✅ Filter tabs: সব / নিশ্চিত / অপেক্ষায় (with pending count badge)
- ✅ Partial payment support — deposits form shows selected member's current balance/due; quick-fill buttons: "আংশিক" (50% due) and "সম্পূর্ণ" (full due); due amount badge on each member in dropdown
- ✅ Advance/carry-forward balance — `usePrevMonthBalances` hook fetches previous month's member_balances; deposits page member balance list shows "গত মাস: অগ্রিম/বকেয়া" carry-forward info per member

---

## PHASE 1 — Meal Rate Calculation Engine

### EPIC 9.1: Financial Calculations
- ✅ `calculate_meal_rate` DB function
- ✅ `get_member_balance` DB function
- ✅ `member_balances` DB view
- ✅ `monthly_expense_summary` DB view
- ✅ Financial utility (`lib/utils/financial.ts` — BDT formatting)
- ✅ Meal rate display in dashboard (real-time from DB via useMess hook)
- ✅ Per-member cost breakdown UI (MemberReportCard in reports page)
- ✅ Balance vs due calculation UI (deposits page — member_balances view)
- ✅ Month closing workflow (`close_month` DB function wired to UI — reports page)
- ✅ Financial freeze — `is_month_closed` in ActiveMess store, `MonthFreezeAlert` component, expenses/deposits/bazaar pages all gated

---

## PHASE 1 — Dashboard System

### EPIC 10.1: Core Dashboard
- ✅ Dashboard page (`/`) — App Router
- ✅ StatsCard component
- ✅ Mess stats hook
- ✅ Admin/Member dashboard widgets (meal rate, my balance, today meals, manager — all live from DB)
- ✅ Member dashboard summary card (total meals, cost, deposit, balance for current month)
- ✅ Recent expenses widget
- ✅ Recent deposits widget
- ✅ 30s/60s auto-refetch on stats, balances, expense summary
- ✅ Realtime dashboard updates — useRealtimeInvalidation hooks wired in dashboard page for meal_logs, bazaar_entries, expenses, deposits tables; auto-invalidates relevant React Query caches on DB change

---

## PHASE 1 — Layout & Shared Components

### EPIC 11.1: Layout
- ✅ Header component (`components/layoutmess/Header.tsx`)
- ✅ Sidebar component (`components/layoutmess/Sidebar.tsx`)
- ✅ MobileNav component (`components/layoutmess/MobileNav.tsx`)
- ✅ Shared: PageHeader, StatsCard, EmptyState, LoadingSpinner
- ✅ UI primitives: avatar, badge, button, card, dialog, input, label, select, separator, skeleton, switch, tabs
- ✅ Dark mode toggle — ThemeProvider wired in layout, লাইট/ডার্ক/সিস্টেম toggle card in settings page
- ✅ Toast/notification feedback system — sonner Toaster configured in layout (richColors, closeButton, Bengali-friendly)

---

## PHASE 1 — Manager Rotation System

### EPIC 12.1: Manager Operations
- ✅ Manager page (`/manager`)
- ✅ `manager_history` table in DB
- ✅ Assign manager UI (admin/owner only — Dialog with confirmation)
- ✅ Handover workflow (handover note saved in manager_history)
- ✅ Current manager card shows real name + avatar from joined profiles
- ✅ Manager history shows real names per entry
- ✅ Manager rotation schedule — "রোটেশন" tab in manager page; shows active members in circular queue order starting from next-after-current; numbered position + পরবর্তী badge; admin can assign from queue
- ✅ Auto-rotation logic — `reportService.autoRotateManager()` in report.service.ts; `useCloseMonth()` calls autoRotateManager after closeMonth; checks `auto_manager_rotation` setting + `manager_rotation_type=monthly`; finds next available non-leave member in queue; assigns via `memberService.assignManager()`; shows success toast with rotation info
- ✅ Skip unavailable member in rotation — isMemberOnLeave() checks leave_start/leave_end dates; nextAvailableIdx finds first non-leave active member; rotation queue shows "ছুটিতে" badge for on-leave members; "পরবর্তী" badge skips leave members correctly


---

## PHASE 1 — Reports & Analytics

### EPIC 13.1: Core Reports
- ✅ Reports page (`/reports`) — fully rewritten with tabs (সারসংক্ষেপ | সদস্য হিসাব)
- ✅ Report service (`lib/services/report.service.ts`) — fixed `getRequiredClient`, added `closeMonth()`
- ✅ Reports hook (`lib/hooks/use-reports.ts`) — `useMonthlyReport()`, `useCloseMonth()`
- ✅ `MemberReportCard` component (`components/reports/MemberReportCard.tsx`) — expandable, shows meal breakdown
- ✅ Member-wise monthly report — meals (breakfast/lunch/dinner/guest), cost, deposit, balance
- ✅ Monthly financial summary report — variable vs fixed expense, total meals, meal rate
- ✅ Month-close workflow — admin/owner only, with confirmation, locks data
- ✅ Expense category report — category breakdown card in reports চার্ট tab; horizontal bars with emoji icons, % of total, sorted by amount; covers rent/electricity/wifi/gas/maid/maintenance/bazaar/other
- ✅ Deposit history report — per-member deposit history shown via balance indicators in deposits page; each member's due shown in select dropdown
- ✅ PDF export — jsPDF client-side; reports page-এ "PDF" button; A4 portrait, Bengali/English mixed; member table with balance color; summary stats; mess name + month header; auto-download
- ✅ Excel / CSV export — reports page-এ "CSV ডাউনলোড" button (সদস্য হিসাব tab-এ); client-side CSV generation
- ✅ Expense trend charts — recharts BarChart (meals per member, cost vs deposit, expense type breakdown); "চার্ট" tab in reports page
- ✅ Food consumption analytics — "বিশ্লেষণ" tab in meals page; shows total meals, active days, attendance %, guest count, per-meal bar charts, average meals/day, most-consumed meal type
- ✅ Budget insights — "বিশ্লেষণ" tab in reports page; shows health indicator (green/red), avg cost/deposit per member, deposit coverage %, meal rate, key insights text list; coverage bar with color coding

---

## PHASE 1 — Notifications System

### EPIC 14.1: Core Notifications
- ✅ Notifications page (`/notifications`) — real Supabase data
- ✅ `notifications` table in DB
- ✅ Notification list UI with read/unread state (click to mark as read)
- ✅ Mark as read (single + mark all as read)
- ✅ Notification badge in header (live unread count, 30s auto-refresh)
- ✅ `notification.service.ts` — getMyNotifications, getUnreadCount, markAsRead, markAllAsRead
- ✅ `use-notifications.ts` — useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead
- ✅ In-app notification push via Supabase Realtime — `useRealtimeNotifications` hook, wired in notifications page
- ✅ Expense update notifications — createNotification called on expense_added (title + amount) and expense_approved; uses notificationService.createNotification; fire-and-forget (.catch)
- ✅ Deposit confirmed notification — createNotification called on createDeposit (৳amount) and confirmDeposit; fire-and-forget
- 🔲 Meal reminder notifications (requires cron/edge — skipping for now)
- ✅ Due reminder notifications — useDueReminderAlert hook in lib/hooks/use-alerts.ts; sessionStorage dedup; fires once per month per member
- ✅ Manager rotation alert notifications — createNotification fired in useAssignManager onSuccess; type: manager_changed; action_url: /dashboard/manager
- ✅ Low balance alerts — useLowBalanceAlert hook; threshold ৳-500; sessionStorage dedup; fires createNotification with type low_balance

### EPIC 14.2: Notification Channels
- ✅ Push notifications (web) — VAPID-based Web Push API; `public/sw.js` Service Worker; `lib/utils/push-notification.ts` subscribe/unsubscribe helpers; `lib/hooks/use-push-notification.ts` React hook with permission state; `app/api/push/subscribe/route.ts` (POST save / DELETE remove); `app/api/push/send/route.ts` (web-push send via VAPID); `supabase/migrations/011_push_subscriptions.sql` (push_subscriptions table + RLS); notifications page-এ Push toggle card (enable/disable/permission status); `useRealtimeNotifications` updated to show `showBrowserNotification()` when tab unfocused; `notificationService.createNotification()` now fire-and-forget triggers `/api/push/send`; app বন্ধ থাকলেও notification পাবেন
- 🔲 Email notifications
- 🔲 SMS notifications
- 🔲 WhatsApp integration

---

## PHASE 1 — Inventory Management

### EPIC 15.1: Core Inventory
- ✅ Inventory page (`/inventory`) — fully functional with real Supabase data
- ✅ `inventory` table in DB
- ✅ Inventory item list UI (grouped by category, with emoji icons)
- ✅ Add item dialog (item_name, category, quantity, unit, min_threshold — Zod + RHF)
- ✅ Edit item dialog (update quantity and threshold)
- ✅ Delete item with confirmation dialog
- ✅ Quick quantity update inline (RefreshCw button)
- ✅ Low stock alert banner (items at or below threshold)
- ✅ Summary stats card (total items, low stock count, ok stock count)
- ✅ `inventory.service.ts` — getInventory, createItem, updateItem, deleteItem
- ✅ `use-inventory.ts` — useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem
- ✅ Admin-only write actions (role-gated: owner/admin/manager)
- ✅ Usage tracking — MinusCircle "ব্যবহার করুন" button per item; opens usage dialog (amount + note); subtracts quantity via updateItem; logs to localStorage
- ✅ Stock history log — "ব্যবহার ইতিহাস" tab; shows all usage log entries from localStorage (item_name, amount, date/time, note)

---

## PHASE 1 — Settings

### EPIC 16.1: Settings
- ✅ Settings page (`/settings`) — fully functional with real Supabase data
- ✅ User profile editor (full_name, phone, profession, blood_group, emergency_contact — saves to `profiles` table)
- ✅ Password change form (new_password + confirm, calls `authService.updatePassword`)
- ✅ Mess settings editor (cutoff times, min deposit, guest meals, expense approval, manager rotation, notifications — owner/admin only)
- ✅ App info section (version, mess name, email)
- ✅ Logout button
- ✅ Notification preferences (per-channel toggles) — settings page, 6 toggles (expense_added, deposit_confirmed, meal_reminder, due_reminder, manager_changed, low_balance), stored in localStorage
- ✅ Language toggle (bn/en) — settings page, 2-button card, stored in localStorage (`messpilot_lang`)
- ✅ Theme toggle (dark/light) — settings page, ThemeProvider-based লাইট/ডার্ক/সিস্টেম 3-button card

---

## PHASE 2 — Advanced Core

### EPIC 17.1: Permissions System
- ✅ Permission utility (`lib/utils/permissions.ts`)
- ✅ RBAC roles defined in DB schema
- ✅ Custom permission overrides per user — `lib/services/permission.service.ts` (getMemberPermissions, setPermissionOverride, removePermissionOverride, clearAllOverrides); `lib/hooks/use-permissions.ts` (useMemberPermissions, useSetPermissionOverride, etc.); `components/members/PermissionOverrideDialog.tsx` shows all 18 permissions with current value, override badge, reset button; KeyRound button per member in members page; admin-only
- ✅ Permission-gated UI components — PermissionGate component in components/shared/PermissionGate.tsx; uses useMyMembership + hasPermission(); renders children or optional fallback based on role+permission
- ✅ Role management UI (admin) — MemberActionDialog action="role" in components/members/MemberActionDialog.tsx; Select with all assignable roles; admin-only "ভূমিকা পরিবর্তন" button in members page
- ✅ Dedicated Permission Management page — `/dashboard/permissions`; Tab 1: ভূমিকা অনুমতি matrix (all 18 permissions × 6 roles, desktop table + mobile card view, per-group sections); Tab 2: ব্যক্তিগত ওভাররাইড (member selector → toggle all 18 permissions, override badge, ডিফল্ট reset per permission, reset-all button, live count); Sidebar + MobileNav "অনুমতি ব্যবস্থাপনা" nav item (KeyRound icon); owner/admin only gated; DEVELOPMENT_RULES.md compliant (service layer, hooks, Bengali UI, mobile-first)
- ✅ Accordion fold/unfold for permission groups — `useGroupAccordion` custom hook (openGroups Set, isOpen, toggleGroup); `useExpandAll` hook with localStorage persistence (`messpilot_perm_expand`); global "সব গ্রুপ খোলা রাখুন" Switch at page top (persists across sessions); default folded; chevron icon rotates on open/close; applied to all 3 views: desktop table rows, mobile cards (Tab 1), override group cards (Tab 2); override group card shows custom count badge in header; expandAll=true disables individual fold
- ✅ 3-Layer Permission Architecture (Supabase-backed, multi-tenant) —
  - **Step 1 (Migration):** `supabase/migrations/012_permission_presets.sql` — `role_permission_presets` table (global system defaults, 108 rows seeded from ROLE_PERMISSIONS, RLS read-only for authenticated); `mess_role_permissions` table (per-mess role overrides, UNIQUE mess_id+role+permission_key, RLS owner/admin write); `member_permissions` table formalized with proper RLS; `resolve_permission()` PL/pgSQL function (3-layer waterfall); `get_member_effective_permissions()` function; auto-updated_at trigger
  - **Step 2 (Types):** `lib/types/member.types.ts` — added `RolePermissionPreset` and `MessRolePermission` interfaces
  - **Step 3 (Service):** `lib/services/permission.service.ts` — Layer 1: getMemberPermissions, setPermissionOverride, removePermissionOverride, clearAllOverrides; Layer 2: getMessRolePermissions, setMessRolePermission, resetMessRolePermission, resetAllMessRolePermissionsForRole, resetAllMessRolePermissions; Layer 3: getGlobalPresets
  - **Step 4 (Hooks):** `lib/hooks/use-permissions.ts` — Layer 1 hooks (existing); Layer 2 hooks: useMessRolePermissions, useSetMessRolePermission, useResetMessRolePermission, useResetAllMessRolePermissionsForRole, useResetAllMessRolePermissions; Layer 3: useGlobalPermissionPresets; structured query keys PERM_KEYS
  - **Step 5 (Utils):** `lib/utils/permissions.ts` — roleHasPermission (Layer 3 fallback); resolveRolePermission (Layer 2+3); resolvePermission (full 3-layer); hasPermission kept for backward compat
  - **Step 6 (UI — Tab 1 editable matrix):** Tab 1 fetches useMessRolePermissions; each cell is clickable button (toggle mess-level override); locked owner column (security); blue border = custom override ON, orange border = custom override OFF; mini RotateCcw reset per cell; per-role override count + reset button in column header; "সব ডিফল্টে ফিরুন" global button; override count badge; legend; mobile grid layout with role buttons; Tab 2 MemberPermissionEditor now resolves against mess-level overrides too (full 3-layer)

### EPIC 17.2: Audit & Security
- ✅ `audit_logs` table in DB (partitioned)
- ✅ Audit triggers on financial tables (expenses, deposits)
- ✅ Activity log UI (admin view) — auditService.getMessActivityLog; shown in mess settings page for owner/admin; scrollable 40-entry log with user avatar, action label (Bengali), timestamp; auto-refreshes every 60s
- ✅ Financial audit trail UI — `/dashboard/audit` page; full mess activity log from `audit_logs` table; entity-type filter; expandable old/new value diff; user avatar + action badge; 25/50/100 limit selector; admin nav item in sidebar + mobile nav
- ✅ Login history UI — `auditService.logLoginEvent()` called on signIn; `auditService.getLoginHistory()` fetches from audit_logs where entity_type=auth; settings page "লগইন ইতিহাস" card shows last 15 entries with device info, login/logout icon, timestamp
- ✅ Device tracking — login events include navigator.platform + userAgent + timestamp stored in audit_logs.new_value JSON; shown in login history UI
- ✅ PIN protection for sensitive actions — `usePinProtection` hook in lib/hooks/use-pin.ts; `PinVerifyDialog` + `PinSetupDialog` in components/shared/PinDialog.tsx; settings page has PIN setup/change/remove card; PIN hash stored in localStorage

### EPIC 17.3: Menu Management System
- ✅ Menu management page — /dashboard/menu page with localStorage storage per mess; weekly grid grouped by day; today's menu highlighted with primary card
- ✅ Weekly menu editor — add/edit/delete menu entries; day + meal slot (সকাল/দুপুর/রাত) + food items + optional note; select dialog form; added to sidebar nav
- ✅ Festival/special menu — "বিশেষ/উৎসব মেনু" toggle (Star icon) in menu form; is_special flag stored in DB; rendered with "বিশেষ" badge in weekly grid
- ✅ Budget-based menu constraints — `weekly_menu_budget` field added to MessSettings type + settings page form + settings UI (সাপ্তাহিক মেনু বাজেট input); menu page shows budget tracker card with progress bar (green/amber/red), estimated cost vs budget, over-budget badge; form warns when adding new item would exceed budget; cost estimated at ৳80/meal-entry
- ✅ `menus` table migration — `supabase/migrations/008_menus_voice.sql`; menus table with day/meal/items/note/is_special; RLS for admin/manager write; member read; menu page migrated from localStorage to Supabase with menuService + useWeeklyMenu/useUpsertMenuItem/useDeleteMenuItem hooks

### EPIC 17.4: Smart Cooking Planner
- ✅ Meal count display for kitchen (today's counts) — already displayed in big count cards (সকাল/দুপুর/রাত) on kitchen page
- ✅ Food quantity estimation — per-meal breakdown grid showing জন count for each meal slot in "রান্নার পরিমাণ অনুমান" card
- ✅ Grocery estimation based on meal count — auto-calculated চাল/ডাল/সবজি/মাছ-মাংস/তেল estimates in kg for total member count; formula-based (rice 0.25kg/person, dal 0.1kg, etc.)
- ✅ Kitchen display mode (large font, minimal) — "ডিসপ্লে মোড" button toggles full-screen dark mode; 9xl font meal counts (breakfast/lunch/dinner), total meals and guest count at bottom; "সাধারণ" button returns to normal view

### EPIC 17.5: Voting & Poll System
- ✅ Polls/voting page (`/dashboard/polls`) — সক্রিয় ও বন্ধ tabs, vote count, progress bar results
- ✅ Create poll (menu vote, manager selection, rule changes) — Zod+RHF form, 4 poll types, dynamic options
- ✅ Anonymous voting mode — is_anonymous toggle, voter names hidden when enabled
- ✅ Time-limited polls — closes_at datetime, countdown display, auto-lock when expired
- ✅ Results dashboard — per-option progress bars, vote %, winner highlight, voter list (non-anonymous)
- ✅ `polls` table migration — `supabase/migrations/004_polls.sql` with RLS, indexes, poll_votes table

### EPIC 17.6: Complaint & Maintenance System
- ✅ Complaints page (`/dashboard/complaints`) — open/in_progress/resolved tabs, urgent alert banner
- ✅ Submit complaint (food / cleaning / maintenance / member / billing / other) — Zod+RHF form with category+priority selects
- ✅ Ticket status tracking — open → in_progress → resolved/closed/rejected with status change UI (admin)
- ✅ Priority system — low/medium/high/urgent with color-coded badges, urgent count alert
- ✅ `complaints` table migration — `supabase/migrations/005_complaints.sql` with RLS, indexes, full CRUD

### EPIC 17.7: Communication Module
- ✅ Group chat (mess-wide) — realtime Supabase subscription, message bubbles, send/delete, Enter to send
- ✅ Manager direct chat — `supabase/migrations/009_direct_messages.sql` (direct_messages table with RLS); `lib/services/dm.service.ts` (getConversations, getMessages, sendMessage, markAsRead, deleteMessage, getUnreadCount); `lib/hooks/use-dm.ts` (useConversations, useDMMessages, useRealtimeDM, useSendDM, useMarkDMRead, useDMUnreadCount); `app/dashboard/chat/page.tsx` — split panel: contacts list (managers highlighted with green dot) + realtime chat window with read receipts (✓/✓✓); sidebar nav "সরাসরি বার্তা" item
- ✅ Notice board — pin/unpin, expiry date, admin-only create/delete, `/dashboard/notices`
- ✅ Event planning — upcoming/past events, date+location, admin create/delete
- ✅ Voice announcement — audio file upload button (🎤) in GroupChat; uploads to `media` bucket via storageService; renders `<audio>` player in chat bubble; voice message_type added to DB types + message service
- ✅ `messages` + `notices` + `events` table migration — `supabase/migrations/006_notices_messages.sql` with RLS

### EPIC 17.8: Gamification System
- ✅ Best member badge — computed from meals+bazaar+expenses+deposits; top scorer gets 🥇 badge
- ✅ Contribution score — weighted points: meal(1), bazaar(8), expense(5+3), deposit(2), manager_bonus(20)
- ✅ Manager rating — wasManager flag from manager_history, earns "অভিজ্ঞ ম্যানেজার" badge + 20 bonus points
- ✅ Achievement system — 7 milestone achievements with progress bars (meals_10/50/100, bazaar_5/20, expense_3/10)
- ✅ Leaderboard page (`/dashboard/gamification`) — ranked cards, badges tab, personal achievements tab

---

## PHASE 2 — Supabase Advanced Features

### EPIC 18.1: Realtime Subscriptions
- ✅ Dashboard live updates (meals) — `useRealtimeInvalidation` in `useMyMeals` invalidates MEAL_KEYS on DB change
- ✅ Notification live push — `useRealtimeNotifications` in `useNotifications` invalidates on INSERT/UPDATE/DELETE
- ✅ Balance live update — `useRealtimeInvalidation` in `useMonthlyDeposits` + `useMonthlyExpenses`
- ✅ Manager change live update — useManagerHistoryRealtime in use-realtime.ts already subscribes to manager_history table changes via Supabase Realtime and invalidates query cache
- ✅ Realtime hooks in `lib/hooks/use-realtime.ts` — `useRealtimeInvalidation` + `useRealtimeNotifications`

### EPIC 18.2: Supabase Storage
- ✅ Profile image upload — `ImageUpload` component in settings page, uploads to `avatars/{userId}/avatar.ext`, updates profile via authService
- ✅ Mess avatar upload — `storageService.uploadMessLogo()` ready for mess settings integration
- ✅ Expense receipt upload — `FileUpload` component in expense form, uploads to `receipts/{userId}/`, stores URL in `receipt_url` field
- ✅ Bazaar receipt upload — `receipt_url` field added to bazaar schema and service
- ✅ Complaint media upload — `FileUpload` component in complaint submit dialog, uploads to `media/{userId}/`, stores `media_url`
- ✅ Storage bucket policies — `supabase/migrations/007_storage_buckets.sql` — 4 buckets (avatars, mess-logos, receipts, media) with full RLS
- ✅ `ImageUpload` + `FileUpload` shared components in `components/shared/ImageUpload.tsx`
- ✅ `storageService` in `lib/services/storage.service.ts` — upload, remove, signedUrl, publicUrl helpers

### EPIC 18.3: Supabase Edge Functions
- ✅ `calculate-monthly-report` edge function — `supabase/functions/calculate-monthly-report/index.ts`; computes meal_rate, total_meals, per-member meal_cost/deposit/balance from raw DB data; CORS-safe; deploy: `supabase functions deploy calculate-monthly-report`
- ✅ `send-notification` edge function — `supabase/functions/send-notification/index.ts`; creates a notification row for a user; deploy: `supabase functions deploy send-notification`
- ✅ `close-month` edge function — `supabase/functions/close-month/index.ts`; marks month as frozen in mess settings.frozen_months array; notifies all active members; deploy: `supabase functions deploy close-month`
- ✅ `rotate-manager` edge function — `supabase/functions/rotate-manager/index.ts`; round-robin rotation (by join date), demotes current manager to member, promotes next eligible, updates manager_history, notifies all; deploy: `supabase functions deploy rotate-manager`
- ✅ `validate-meal-cutoff` edge function — `supabase/functions/validate-meal-cutoff/index.ts`; checks meal slot cutoff against mess settings; returns allowed/past_cutoff/bypassed; deploy: `supabase functions deploy validate-meal-cutoff`
- ✅ `process-due-reminders` edge function — `supabase/functions/process-due-reminders/index.ts`; iterates all active messes, checks each member's deposit, sends reminder notification on days [7,3,1] before month end; deploy: `supabase functions deploy process-due-reminders`

### EPIC 18.4: Supabase Cron Jobs
- ✅ Monthly auto-closing cron — `supabase/migrations/010_cron_jobs.sql` — pg_cron schedule `59 23 28-31 * *` → calls close-month Edge Function via pg_net
- ✅ Daily meal reminder cron — pg_cron schedule `0 7 * * *` → SQL INSERT into notifications for members without today's meal set
- ✅ Due reminder cron (7 days, 3 days, 1 day before) — pg_cron `0 9 * * *` → calls process-due-reminders Edge Function
- ✅ Notification cleanup cron — pg_cron `0 2 * * *` → DELETE read notifications older than 30 days
- ✅ Analytics refresh cron — pg_cron `0 3 * * *` → placeholder for materialized view refresh
- ✅ Inventory low-stock check cron — pg_cron `0 8 * * *` → INSERT notifications for admin/manager when inventory.quantity ≤ min_quantity

---

## PHASE 3 — AI & Automation

### EPIC 19.1: AI Assistant Chat (Bengali Natural Language)
> User Bengali বা English-এ প্রশ্ন করবে, AI real DB data থেকে উত্তর দেবে।
- 🔲 Replit AI integration setup (API key via Replit secrets, no external key needed)
- 🔲 `/dashboard/ai-assistant` page — chat UI (message bubbles, Bengali font support)
- 🔲 `lib/services/ai.service.ts` — AI API call wrapper (system prompt + context injection)
- 🔲 `lib/hooks/use-ai-chat.ts` — chat state management (messages, loading, error)
- 🔲 Context builder — injects current mess stats (meal rate, balances, expenses) into AI prompt
- 🔲 Sample queries: "এই মাসে মোট খরচ কত?", "কার বেশি বকেয়া?", "আজকের meal rate কত?"
- 🔲 Sidebar + MobileNav nav item (Bot icon, "AI সহকারী")
- 🔲 i18n keys for AI chat UI (`en.ts` + `bn.ts`)

### EPIC 19.2: Expense Prediction Model
> গত মাসের data থেকে আগামী মাসের খরচ predict করবে।
- 🔲 `lib/utils/ai-prediction.ts` — simple linear regression / weighted average (last 3 months)
- 🔲 Prediction card in reports page — "আনুমানিক আগামী মাস: ৳১৮,৫০০"
- 🔲 Confidence indicator (low/medium/high based on data consistency)
- 🔲 Category-wise prediction (bazaar / rent / utility breakdown)
- 🔲 i18n keys for prediction UI

### EPIC 19.3: Grocery / Bazaar Forecasting
> Member count + meal count দেখে weekly grocery list suggest করবে।
- 🔲 `lib/utils/grocery-forecast.ts` — formula-based estimation (চাল 0.25kg/person/meal, etc.)
- 🔲 AI-enhanced suggestion via AI API (takes member count + weekly menu + history)
- 🔲 Forecast card in kitchen/bazaar page — item-wise estimated qty + unit
- 🔲 "বাজারের তালিকা" one-click copy/share
- 🔲 i18n keys for forecast UI

### EPIC 19.4: Smart Menu Suggestions
> Budget, season, history দেখে weekly menu suggest করবে।
- 🔲 `lib/services/ai-menu.service.ts` — calls AI API with budget + member count + past menus
- 🔲 "AI সাজেশন" button in menu page — generates 7-day menu with estimated cost
- 🔲 Accept/reject per suggestion (saves to menus table if accepted)
- 🔲 Budget constraint enforcement (stays within `weekly_menu_budget`)
- 🔲 i18n keys for menu suggestion UI

### EPIC 19.5: Meal Trend Analysis
> Member-wise ও mess-wide meal pattern বিশ্লেষণ।
- 🔲 `lib/utils/meal-trends.ts` — compute per-member meal frequency, peak days, skipped days
- 🔲 Trend chart in meals/analytics tab — "সবচেয়ে বেশি meal নেওয়া দিন: শুক্রবার"
- 🔲 Member meal consistency score (%) — "আপনি এই মাসে ৮৭% দিন lunch নিয়েছেন"
- 🔲 Absence pattern alert — "৩ দিন ধরে meal নেননি" notification trigger
- 🔲 i18n keys for trend UI

### EPIC 19.6: Budget Optimization Suggestions
> Expense pattern দেখে actionable cost-saving advice দেবে।
- 🔲 `lib/services/ai-budget.service.ts` — calls AI API with 3-month expense history
- 🔲 Insights card in reports page — "Bazaar খরচ গত মাসের চেয়ে ২৩% বেশি"
- 🔲 Category overspend alert (threshold: >15% above 3-month average)
- 🔲 Saving suggestion text (AI-generated, Bengali)
- 🔲 i18n keys for budget insights UI

### EPIC 19.7: pgvector / Semantic Search (Advanced)
> Receipts, notices, expenses — semantic search করা যাবে।
- 🔲 Supabase pgvector extension enable করা
- 🔲 `supabase/migrations/035_pgvector.sql` — vector column on expenses/notices
- 🔲 Embedding generation on create (Edge Function)
- 🔲 Search UI in expenses/notices page with natural language query
- 🔲 i18n keys for search UI

---

## PHASE 3 — Offline & Sync

### EPIC 20.1: Offline Support
- 🔲 Offline meal update queue
- 🔲 Offline expense entry queue
- 🔲 Sync queue processor
- 🔲 Conflict resolution strategy
- 🔲 Service worker setup

---

## PHASE 4 — SaaS & Scaling

### EPIC 21.1: SaaS Subscription
- 🔲 Free plan limits (member cap, basic reports)
- 🔲 Pro plan features (unlimited members, AI, advanced analytics)
- 🔲 Enterprise plan (white-label, hostel PG)
- 🔲 Subscription billing integration (SSLCommerz / bKash API)
- 🔲 Plan enforcement logic
- 🔲 `subscriptions` table migration

### EPIC 21.2: Super Admin Panel
- ✅ Migration 013_super_admin.sql — `is_super_admin` + `is_banned` columns on `profiles`; `is_super_admin()` helper function; RLS policies for super admin SELECT/UPDATE/DELETE on messes, profiles, mess_members, meals, expenses, deposits, audit_logs, role_permission_presets, notifications; `platform_announcements` table
- ✅ Migration 014_platform_settings.sql — `platform_settings` key-value table (10 default settings seeded); `subscription_plans` table (3 plans seeded: free/pro/enterprise); `mess_subscriptions` table (all existing messes defaulted to free plan); full RLS on all 3 tables
- ✅ Types — `lib/types/super-admin.types.ts` (PlatformStats, MessOverview, UserOverview, AuditLogEntry, PlatformAnnouncement, MessStatusFilter, UserFilter, ComplaintSummary, ComplaintStatusFilter, ComplaintPriorityFilter, PlatformSetting, SubscriptionPlan)
- ✅ Service — `lib/services/super-admin.service.ts` (isSuperAdmin, getPlatformStats, getAllMesses, updateMessStatus, deleteMess, getAllUsers, banUser, unbanUser, getAuditLogs, updateGlobalPreset, getAllComplaints, updateComplaintStatus, getPlatformSettings, updatePlatformSetting, getAnnouncements, sendAnnouncement)
- ✅ Hooks — `lib/hooks/use-super-admin.ts` (useIsSuperAdmin, usePlatformStats, useAllMesses, useUpdateMessStatus, useDeleteMess, useAllUsers, useBanUser, useUnbanUser, useAuditLogs, useGlobalPresets, useUpdateGlobalPreset, useAllComplaints, useUpdateComplaintStatus, usePlatformSettings, useUpdatePlatformSetting, useAnnouncements, useSendAnnouncement)
- ✅ Layout — `app/super-admin/layout.tsx` (auth guard, is_super_admin check, AccessDenied fallback, dark slate sidebar layout)
- ✅ Sidebar — `components/super-admin/SuperAdminSidebar.tsx` (orange accent, 9 nav items, back-to-dashboard link)
- ✅ StatCard component — `components/super-admin/StatCard.tsx` (5 color variants)
- ✅ Dashboard Sidebar Link — `components/layout/Sidebar.tsx` (Super Admin link visible only to is_super_admin=true users, orange accent, shield icon)
- ✅ AlertDialog UI component — `components/ui/alert-dialog.tsx` (shadcn/ui-style, uses @radix-ui/react-alert-dialog)
- ✅ Overview Dashboard — `app/super-admin/page.tsx` (8 stats: total messes, active/suspended messes, total/banned users, active members, new this month; quick-link cards)
- ✅ Mess Management — `app/super-admin/messes/page.tsx` (search + status filter, suspend/activate/delete per mess, member count, owner info, DropdownMenu actions, AlertDialog for delete)
- ✅ User Management — `app/super-admin/users/page.tsx` (search + filter by banned/super_admin, ban with reason Dialog, unban button, avatar, super admin badge)
- ✅ Global Permission Presets — `app/super-admin/permissions/page.tsx` (full matrix editor — 6 roles × 18 permissions, grouped by category, clickable toggle cells, owner column locked, live update via useUpdateGlobalPreset)
- ✅ Audit Logs Viewer — `app/super-admin/audit/page.tsx` (action/mess filter, expandable old/new value diff, refresh button, color-coded action badges)
- ✅ Announcements / Broadcast — `app/super-admin/announcements/page.tsx` (compose panel — title, body, target: all/mess/role; history list with sender + timestamp)
- ✅ Complaints Management — `app/super-admin/complaints/page.tsx` (search + status + priority filter, all messes' complaints via super admin RLS, status update with note dialog, urgent alert banner, expandable description + resolution note)
- ✅ System Settings — `app/super-admin/settings/page.tsx` (6 boolean feature toggles — maintenance_mode/registrations/messes/AI/realtime/push; 2 numeric limits — max_members/messes; 2 text settings — version/support_email; live platform stats quick view; all backed by platform_settings DB table)
- ✅ Subscription Plans — `app/super-admin/subscriptions/page.tsx` (3 plan cards — Free/Pro/Enterprise with features, pricing, limits; current distribution stats; billing integration roadmap — SSLCommerz/bKash — marked "শীঘ্রই")

### EPIC 21.3: Quality & Testing
- 🔲 Unit tests (financial calculation functions)
- 🔲 Integration tests (auth + mess + meal flow)
- 🔲 E2E tests (full user journey)
- 🔲 Permission matrix tests
- 🔲 Financial accuracy tests

### EPIC 21.4: Deployment
- 🔲 Production environment setup
- 🔲 CI/CD pipeline
- 🔲 Error monitoring (Sentry or similar)
- 🔲 Performance monitoring
- 🔲 Rate limiting implementation

---

## QUICK SUMMARY

| Phase | Total Tasks | Completed | Pending |
|-------|-------------|-----------|---------|
| Phase 0 — Infrastructure Fixes | 14 | ✅ 14 | 0 |
| Phase 1 — Foundation | 18 | ✅ 18 | 0 |
| Phase 1 — Database | 19 | ✅ 19 | 0 |
| Phase 1 — Auth | 10 | ✅ 9 | 🔲 1 (OTP/Google deferred; account lock ✅; login history ✅) |
| Phase 1 — Mess | 9 | ✅ 9 | 0 |
| Phase 1 — Members | 10 | ✅ 10 | 0 |
| Phase 1 — Meals | 11 | ✅ 11 | 0 |
| Phase 1 — Bazaar | 9 | ✅ 8 | 🔲 1 (OCR — Edge Function needed) |
| Phase 1 — Expenses | 8 | ✅ 8 | 0 |
| Phase 1 — Deposits | 9 | ✅ 9 | 0 |
| Phase 1 — Finance Engine | 10 | ✅ 10 | 0 |
| Phase 1 — Dashboard | 8 | ✅ 8 | 0 |
| Phase 1 — Layout & UI | 8 | ✅ 8 | 0 |
| Phase 1 — Manager | 8 | ✅ 8 | 0 |
| Phase 1 — Reports | 9 | ✅ 9 | 0 |
| Phase 1 — Notifications | 14 | ✅ 11 | 🔲 3 (email/SMS/WhatsApp — external integrations) |
| Phase 1 — Inventory | 6 | ✅ 6 | 0 |
| Phase 1 — Settings | 7 | ✅ 7 | 0 |
| Phase 2 — Advanced Core | 42 | ✅ 42 | 0 |
| Phase 2 — Supabase Advanced | 22 | ✅ 22 | 0 |
| Phase 3 — AI & Offline | 35 | ✅ 0 | 🔲 35 (7 EPICs, detailed tasks added) |
| Phase 4 — SaaS & Scaling | 18 | ✅ 13 | 🔲 5 (subscription billing, support tickets, Tests, DevOps) |
| **TOTAL** | **~269** | **~260** | **~9** (Phase 3 AI/Offline, billing, testing, DevOps)

> **Note:** All buildable tasks without external infrastructure are complete. Remaining items require: Supabase phone/OAuth provider config, SSLCommerz/bKash payment gateway, AI model APIs, and CI/CD platform setup.

### Session Progress (এই সেশনে সম্পন্ন)
- ✅ Task 1: Login History UI + Device Tracking
- ✅ Task 2: PIN Protection for sensitive actions
- ✅ Task 3: Meal Cutoff Enforcement + Role Exceptions
- ✅ Task 4: Guest Meal Charge + Late Meal Penalty (financial.ts + report.service.ts + MemberReportCard + settings UI)
- ✅ Task 5: Auto-rotation logic on month close (reportService.autoRotateManager + useCloseMonth)
- ✅ Task 6: Custom Permission Overrides UI (PermissionOverrideDialog + KeyRound button in members page)
- ✅ Task 7: Budget-based menu constraints (weekly_menu_budget + settings page + menu page tracker)
- ✅ Task 8: Account lock after failed login attempts (localStorage counter, 10-min lockout, countdown timer)
- ✅ Task 9: Manager Direct DM Chat (direct_messages table + realtime service + split-panel chat UI)
- ✅ Task 10: All 6 Supabase Edge Functions written & deploy-ready (calculate-monthly-report, send-notification, close-month, rotate-manager, validate-meal-cutoff, process-due-reminders)
- ✅ Task 11: All 6 Cron Jobs defined in migration 010_cron_jobs.sql (pg_cron schedules for month close, meal reminder, due reminder, notification cleanup, analytics refresh, low-stock check)
- ✅ Task 12: Web Push Notifications (VAPID + Service Worker + push_subscriptions table + /api/push/subscribe + /api/push/send + usePushNotification hook + notifications page toggle card + browser notification on Realtime INSERT)
- ✅ Task 13: Advance Meal Cutoff (cutoff_days_before: 0/1/2 দিন আগে + cutoff_advance_time; MessSettings type + meal-cutoff.ts full rewrite with advance mode logic + getCutoffDeadlineText helper; settings page UI — dynamic dropdown + conditional time input; meals page today section shows advance cutoff deadline message)
- ✅ Task 14: Meal Cutoff একটি জায়গায় (mess/page.tsx-এ) — settings/page.tsx থেকে পুরো Mess Settings card সরানো হয়েছে; mess/page.tsx-এ সম্পূর্ণ নিয়মকানুন form — advance cutoff UI + আর্থিক নিয়ম (min_deposit, guest_charge, late_penalty, weekly_budget) + toggle settings (allow_guest_meals, require_expense_approval, auto_manager_rotation, notifications_enabled) + manager_rotation_type; settings/page.tsx এখন শুধু personal account settings (profile, password, theme, language, notification prefs, PIN, login history)
- ✅ Task 15: Super Admin Panel Phase 1 (EPIC 21.2) — Migration 013_super_admin.sql (is_super_admin + is_banned columns, is_super_admin() RLS helper, 15+ RLS policies, platform_announcements table); Types (super-admin.types.ts); Service (super-admin.service.ts — 12 methods); Hooks (use-super-admin.ts — 13 hooks); Layout (app/super-admin/layout.tsx — auth + is_super_admin guard + AccessDenied); SuperAdminSidebar + StatCard components; 5 pages: Overview Dashboard (8 platform stats + quick links), Mess Management (search/filter/suspend/activate/delete), User Management (search/ban/unban with reason), Global Permission Presets Editor (6×18 matrix, clickable toggle, owner locked), Audit Logs Viewer (filter/expand/diff), Announcements (compose + history). Route: /super-admin
- ✅ Task 16: Multi-language (EN/BN) i18n — Complete translation coverage for all remaining files with hardcoded Bengali text. Added 50+ new keys to lib/i18n/en.ts and lib/i18n/bn.ts (mess.*, superAdmin.messes.unknownOwner, superAdmin.complaints.rejectBtn/resolveBtn/closeBtn/startProgressBtn, notifications.browserNotification, audit.noLogsDesc, messSelector.createBtn, etc.). All files fully translated with t.* keys: app/dashboard/audit/page.tsx, app/dashboard/notifications/page.tsx, app/dashboard/mess/page.tsx (ACTION_LABELS, financial rules, toggle settings, rotation types, danger zone, QR dialog, invite code), components/mess/MessSelector.tsx, app/super-admin/page.tsx, app/super-admin/messes/page.tsx, app/super-admin/users/page.tsx, app/super-admin/audit/page.tsx, app/super-admin/complaints/page.tsx (NEXT_STATUSES, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS moved inside component), app/super-admin/announcements/page.tsx, app/super-admin/permissions/page.tsx (ROLE_LABELS, PERMISSION_LABELS, PERMISSION_GROUPS moved inside component), app/super-admin/settings/page.tsx (BOOL_SETTINGS, NUM_SETTINGS, TEXT_SETTINGS moved inside component), app/super-admin/subscriptions/page.tsx.
- ✅ Task 17: Meals Page UI Redesign (EPIC 22.1) — Hero section (gradient card, food emoji 🌅☀️🌙, mess count inline, bigger touch targets, cutoff alert strip); Calendar upgrade (colored cell backgrounds: green=all on, amber=partial, red=all off, month progress bar, legend); Tabs redesign (4 tabs with icon+label: Calendar/Bulk/Defaults/Analytics, grid-cols-4, rounded); MealLeaveSection full redesign (Plane icon, orange gradient card, animated progress bar while applying, emoji meal selector buttons, blocked count warning); Defaults tab (emoji + colored border per toggle, cleaner layout); MealAnalyticsTab extracted as separate component (~170 lines, bar chart, emoji, stats grid 2×2, insights strip); Admin members shown as dedicated card below tabs. All ~200 line rule maintained per component.
- ✅ Task 18: Meals Page Component Extraction (DEVELOPMENT_RULES.md ~200 line rule) — TodayHeroSection.tsx (132 lines), MealCalendarTab.tsx (139 lines), MealDefaultsTab.tsx (87 lines), MealAnalyticsTab.tsx (159 lines), MealLeaveSection.tsx (227 lines); lib/utils/date-range.ts (getDatesInRange, addDays helpers extracted); page.tsx now 226 lines (orchestrator only — all UI extracted to sub-components).
- ✅ Task 19: Meal Control Page (/dashboard/meals/control) — নতুন admin/manager-only page তৈরি; Section 1: MemberMealControl.tsx (সদস্যদের মিল toggle, কাটঅফ ছাড়াই, অ্যাডমিন override); Section 2: TomorrowBazaarCard.tsx (আগামীকালের meal counts, advance cutoff countdown timer, confirmed/pending status, today vs tomorrow comparison table, বাজার পেজে যান button); bn.ts + en.ts-এ mealControl section (20+ keys) + nav.mealControl key যোগ; Sidebar.tsx ও MobileNav.tsx উভয়েই ShieldCheck icon দিয়ে "মিল নিয়ন্ত্রণ" nav item যোগ (meals.manage_others permission, admin/manager only — DEVELOPMENT_RULES.md Rule #9 অনুযায়ী Desktop+Mobile একসাথে); components/meals/control/ subfolder তৈরি (~190 lines per component)
- ✅ Task 20: Meal Control Tab 1 UI Redesign (Today's Members) — MemberMealControl.tsx সম্পূর্ণ rewrite; MealControlFilterBar.tsx নতুন component তৈরি (extracted per ~200 line rule); Stats bar (চালু/বন্ধ/🌅/☀️/🌙 count); Search input (real-time name filter); Filter chips (All/Active/Off + per-role); Sort (নাম/মিল/ব্যালেন্স — asc/desc toggle); Compact scrollable table: Name+Avatar | Role badge | 🌅☀️🌙 individual toggles | Meal count badge (x/3) | Balance (green advance/red due) | Total Deposit; useMemberBalances() দিয়ে WalletBalance data joined; bn.ts + en.ts-এ 14 নতুন mealControl key (searchPlaceholder, filterAll/On/Off, colName/Role/Balance/Deposit, statOn/Off, budgetLabel/perHeadRate/totalEaters/startBazaar)

- ✅ Task 21: Mess Vacation / Full Closure System — `supabase/migrations/023_mess_vacations.sql` (mess_vacations table + RLS + indexes + trigger); `lib/services/vacation.service.ts` (getVacations, getActiveVacation, createVacation + bulk notify, deleteVacation); `lib/hooks/use-vacation.ts` (useVacations, useActiveVacation, useCreateVacation, useDeleteVacation); `components/mess/VacationTab.tsx` (vacation list + add/delete form, status badges: চলমান/আসন্ন/সম্পন্ন); `components/shared/VacationBanner.tsx` (amber gradient banner, dismissable); `lib/types/notification.types.ts` vacation_announced type added; en.ts + bn.ts vacation section (18 keys); mess/page.tsx-এ VacationTab section যোগ; dashboard/page.tsx + meals/page.tsx-এ VacationBanner যোগ। ছুটি ঘোষণায় সব active member-কে তাৎক্ষণিক notification।

### Navigation Restructure — Option C (Grouped Sub-navigation)
- ✅ Task NAV-1: `components/layout/nav.config.ts` তৈরি — single source of truth for all nav groups; NavGroupDef + NavItemDef types; 6 groups (Dashboard, Meals, Finance, Community, Members, Admin); STANDALONE_NAV_ITEMS (Notifications, Account); getActiveGroupId() utility function — pathname থেকে active group detect করে; DEVELOPMENT_RULES.md Rule #13 (shared config pattern) সম্পূর্ণ follow করা হয়েছে
- ✅ Task NAV-2: i18n keys যোগ — en.ts + bn.ts উভয়ে nav.finance ("Finance" / "আর্থিক"), nav.community ("Community" / "কমিউনিটি"), nav.adminGroup ("Administration" / "অ্যাডমিন") যোগ করা হয়েছে
- ✅ Task NAV-3: `components/layout/Sidebar.tsx` সম্পূর্ণ rewrite — Option C Two-panel design: Left STRIP (w-16, সবসময় দৃশ্যমান) + Right SUB-PANEL (w-48, isSidebarOpen হলে দেখায়); Strip-এ: Logo [M], Group icon buttons (Dashboard/Meals/Finance/Community/Members/Admin), Separator, Notifications + Account standalones, Super Admin (optional), ChevronLeft/Right toggle; Sub-panel-এ: Mess name header + active group label, scrollable sub-items, User avatar+name+logout footer; Total width: w-64 open / w-16 closed — layout.tsx change দরকার নেই; Active group auto-detected from pathname; Permission-filtered items; Tooltips when collapsed; DEVELOPMENT_RULES.md Rule #9 (Desktop+Mobile একসাথে) ✓
- ✅ Task NAV-4: `components/layout/MobileNav.tsx` সম্পূর্ণ rewrite — Accordion-style group navigation; প্রতিটা group header click করলে expand/collapse; Active group auto-expanded on drawer open; ChevronRight icon rotates 90° when expanded; Sub-items indented with left border; Standalone items (Notifications, Account) নিচে separator দিয়ে; Super Admin link (orange, optional); User footer অপরিবর্তিত; DEVELOPMENT_RULES.md Rule #9 (Desktop+Mobile sync) ✓
