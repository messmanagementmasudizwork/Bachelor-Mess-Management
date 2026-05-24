# MessPilot — Development Rules & Engineering Standards

> **Version:** 2.0.0 | **Platform:** Bachelor Mess Management SaaS  
> Based on the official `Replit_Ai_Development_Rules_For_Bachelor_Mess_Platform` document  
> **⚠️ এই ফাইলটি প্রতিটি কাজ শুরুর আগে অবশ্যই পড়তে হবে।**

---

## 0. MANDATORY — প্রতিটি কাজ শুরুর আগে

```
1. এই DEVELOPMENT_RULES.md ফাইলটি সম্পূর্ণ পড়ুন
2. replit.md পড়ুন
3. প্রাসঙ্গিক existing code পড়ুন — কখনো অনুমান করবেন না
4. Desktop ও Mobile — দুটোতেই একসাথে change করুন
5. Shared config/util থেকে কাজ করুন — duplicate করবেন না
```

## 0.1 PLAN-FIRST RULE (NON-NEGOTIABLE) ⛔

> **এই rule টি সবচেয়ে গুরুত্বপূর্ণ। কোনো কারণেই bypass করা যাবে না।**

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

## 1. Core Identity

This project is built to **enterprise-grade, production-ready** standards.

You are acting as:
- Senior Full Stack Engineer
- Senior SaaS Architect  
- Senior Product Engineer
- Senior Database Architect
- Senior Security Engineer
- Startup CTO mindset

**Every output must be:** Production-grade | Scalable | Secure | Maintainable | Modular | Clean | Reusable

---

## 2. Technology Stack (MANDATORY)

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

## 3. Architecture Rules

```
Feature-based modular architecture:

app/
├── (auth)/          # Auth route group
├── (dashboard)/     # Protected routes
│   ├── meals/
│   ├── expenses/
│   ├── bazaar/
│   ├── deposits/
│   ├── members/
│   ├── reports/
│   ├── settings/
│   └── ...
├── api/             # API routes (server-side only)
└── layout.tsx

lib/
├── supabase/        # Supabase client configs
├── types/           # TypeScript interfaces
├── validations/     # Zod schemas
├── services/        # Business logic (NO DB in components)
├── hooks/           # React Query hooks
├── stores/          # Zustand stores
└── utils/           # Pure utility functions

components/                  ← ROOT level — এটাই REAL app
├── ui/              # Base UI (shadcn style)
├── layout/          # App layout components ← এখানেই সব change করতে হবে
│   ├── Sidebar.tsx      ← Desktop sidebar (REAL file)
│   └── MobileNav.tsx    ← Mobile nav (REAL file)
├── shared/          # Reusable feature-agnostic components
├── mess/            # Mess-specific components
├── meals/           # Meal components
└── ...

⚠️ WARNING: app/mess-management/components/ একটি OLD/UNUSED directory।
   সব কাজ ROOT-এর components/ এ করতে হবে।
```

---

## 4. Security Rules (NON-NEGOTIABLE)

- ✅ **RLS on EVERY table** — no exceptions
- ✅ **RBAC system** — role-based access control
- ✅ **Validate server-side** — never trust frontend
- ✅ **Audit logs** for all financial operations
- ✅ **Session management** via Supabase Auth
- ✅ **Financial locking** — month close prevents edits
- ❌ Never expose raw database errors to users
- ❌ Never hardcode secrets

---

## 5. Financial System Rules

```
Meal Rate = Total Variable Expense / Total Meals
Member Cost = Member Meals × Meal Rate + Fixed Share
Balance = Total Deposited - Total Cost
```

- Use `NUMERIC(12,2)` for all money columns (never FLOAT)
- All financial changes must create audit entries
- Month close is irreversible
- Carry-forward balances to next month

---

## 6. Database Rules

- UUID primary keys (`uuid_generate_v4()`)
- `snake_case` for all column names
- Soft deletes (status field, not DELETE)
- `created_at`, `updated_at`, `created_by` on all tables
- Composite indexes for common query patterns
- Foreign key constraints everywhere

---

## 7. Naming Conventions

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

## 8. Component Rules

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

---

## 9. Navigation & UI Consistency Rules (CRITICAL)

### ⚠️ Desktop ও Mobile সবসময় একসাথে

```
❌ WRONG: Desktop Sidebar-এ কিছু যোগ করা — Mobile-এ না করা
❌ WRONG: Mobile Nav-এ কিছু যোগ করা — Desktop-এ না করা
✅ CORRECT: nav.config.ts-এ change করা — দুটো automatically সিঙ্ক হয়
```

**Navigation এর নিয়ম:**
- সব nav item definition এবং permission `components/layout/nav.config.ts`-এ থাকবে
- `Sidebar.tsx` এবং `MobileNav.tsx` — দুটোই শুধু `nav.config.ts` থেকে import করবে
- কোনো nav item কখনো দুই জায়গায় hardcode করা যাবে না

### Role-Based Navigation

```typescript
// ✅ CORRECT: shared canSeeNavItem() function ব্যবহার করুন
import { canSeeNavItem, mainNavItems, adminNavItems } from "./nav.config";
const visible = allItems.filter(item => canSeeNavItem(item, role));

// ❌ WRONG: একই role check দুই জায়গায়
// Sidebar-এ: role === "owner" && ...
// MobileNav-এ: role === "owner" && ...   ← duplicate!
```

### Role Hierarchy (owner সর্বোচ্চ)

| Role | বাংলা | দেখতে পাবে |
|------|-------|-----------|
| `owner` | মালিক (সুপার অ্যাডমিন) | সব কিছু |
| `admin` | অ্যাডমিন | সব কিছু |
| `manager` | ম্যানেজার | বাজার, খরচ, সদস্য, ইনভেন্টরি, রিপোর্ট |
| `assistant_manager` | সহকারী ম্যানেজার | বাজার, রিপোর্ট |
| `member` | সদস্য | রিপোর্ট |
| `guest` | অতিথি | শুধু হোম, মিল, নোটিফিকেশন, অ্যাকাউন্ট |

### Unknown Role Fallback

```typescript
// অজানা role হলে সব দেখাও — কখনো ভেঙে পড়বে না
function canSeeNavItem(item, role) {
  if (!role) return false;
  if (item.permission === null) return true;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return true; // অজানা role → সব দেখাও
  return perms.includes(item.permission);
}
```

---

## 10. Realtime Subscriptions

Use Supabase Realtime for:
- Dashboard stats (60s refetch or realtime)
- Meal updates (notify all members)
- Expense updates
- Notifications
- Manager changes

```typescript
// Use React Query's refetchInterval for polling
useQuery({ refetchInterval: 30000 }) // 30s

// Or Supabase Realtime channel
supabase.channel('mess-updates')
  .on('postgres_changes', { table: 'meals' }, callback)
  .subscribe();
```

---

## 11. UI/UX Standards

- Mobile-first responsive design
- Bengali language support (`font-bengali` class)
- Minimum touch target: 44×44px
- Loading skeletons (not spinners) for content
- Toast notifications via `sonner`
- No raw error messages shown to users
- Empty states with actionable CTAs

---

## 12. Error Handling Pattern

```typescript
// Service layer
async function createExpense(input) {
  const { data, error } = await supabase.from('expenses').insert(input);
  if (error) throw new Error(error.message); // Typed error
  return data;
}

// Hook layer
const mutation = useMutation({
  mutationFn: createExpense,
  onError: (error: Error) => toast.error(error.message), // User-friendly
});
```

---

## 13. Shared Config Pattern (MANDATORY)

যখনই কোনো config/data একাধিক component-এ দরকার:

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

## 14. Environment Variables

```bash
# Required — configure in .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server only, never expose to client
NEXT_PUBLIC_APP_URL=
```

---

## 15. Git Commit Standards

```
feat: add meal calendar component
fix: correct meal rate calculation
refactor: extract financial utils
docs: update API documentation
chore: update dependencies
```

---

## 16. Supabase Usage Checklist

Before any new feature:
- [ ] RLS policy defined?
- [ ] Indexes added for query patterns?
- [ ] Audit log trigger created?
- [ ] Type-safe with `database.types.ts`?
- [ ] Edge Function needed for business logic?
- [ ] Realtime subscription needed?
- [ ] Foreign key constraints defined?

---

## 17. DO NOT List

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

---

*"Everything generated must feel like real startup engineering — funded SaaS architecture — production-ready enterprise software."*
