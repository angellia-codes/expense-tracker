# Personal Finance & Expense Tracker — Implementation Plan

A production-grade, premium personal finance web application modeled after Monarch Money, YNAB, and Notion — built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, and Supabase.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project Setup**: You will need to provide your Supabase project URL and anon key before the app can connect to the backend. I will create a `.env.example` file with the required variables. Do you already have a Supabase project created?

> [!IMPORTANT]
> **Google OAuth**: For Google Sign-In, you'll need to configure a Google OAuth application in the Google Cloud Console and add the client ID to Supabase Auth settings. I will implement the frontend integration, but you'll need to complete the provider setup in the Supabase dashboard.

> [!WARNING]
> **Scope Management**: This is a very large application. I will build it module-by-module in the following priority order to ensure each module is production-quality before moving on:
> 1. Project scaffolding + Auth + Database schema
> 2. Dashboard + Accounts
> 3. Transactions (CRUD, filters, search)
> 4. Categories + Budgets
> 5. Savings Goals + Recurring Transactions
> 6. Reports + Charts + Analytics
> 7. Calendar View + Notifications + Export
> 8. Settings + Search + Polish

## Open Questions

> [!IMPORTANT]
> **Default Currency**: What is your default currency? (e.g., USD, PHP, EUR). This affects formatting, symbols, and default values throughout the app.

> [!IMPORTANT]
> **Tailwind CSS Version**: You specified Tailwind CSS. I'll use **Tailwind CSS v4** (latest) with the Vite plugin. Is that acceptable, or do you prefer v3?

> [!NOTE]
> **Receipt Storage**: Supabase Storage will be used for receipt image uploads. Free tier allows 1GB. Is that sufficient for your use case?

---

## Architecture Overview

### Design Philosophy
- **Feature-based architecture**: Each feature is self-contained with its own components, hooks, services, and types
- **Clean separation**: Supabase client → Service layer → Custom hooks → Components
- **Type safety**: End-to-end TypeScript with Supabase-generated types
- **Optimistic UI**: Mutations update the UI immediately, rolling back on error
- **Responsive-first**: Mobile-first design with breakpoints for tablet and desktop

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | React Query (TanStack Query) + Context | Server state via React Query for caching/sync; UI state via Context. No Redux needed for a personal app. |
| Routing | React Router v6 | Industry standard, supports lazy loading and protected routes |
| Forms | React Hook Form + Zod | Best DX for complex forms with schema validation |
| Charts | Recharts | Lightweight, composable, React-native charting library |
| Date Handling | date-fns | Tree-shakeable, immutable date utilities |
| Tables | TanStack Table | Headless, performant table with sorting/filtering/pagination |
| Export | jsPDF + SheetJS (xlsx) | Client-side PDF and Excel generation |
| Toast/Notifications | Sonner | Beautiful, minimal toast notifications |
| Icons | Lucide React | Consistent, clean icon set (same family as Linear/Notion) |

---

## Proposed Changes

### 1. Project Scaffolding & Configuration

#### [NEW] Project initialization via Vite
- `npx create-vite` with React + TypeScript template
- Install all dependencies (Tailwind v4, Framer Motion, Supabase, React Query, React Router, Recharts, React Hook Form, Zod, date-fns, Lucide, Sonner, TanStack Table, jsPDF, xlsx)

#### [NEW] Folder Structure
```
src/
├── app/                        # App-level setup
│   ├── App.tsx                 # Root component with providers
│   ├── router.tsx              # Route definitions
│   └── providers.tsx           # Context providers wrapper
├── components/                 # Shared UI components
│   ├── ui/                     # Primitives (Button, Input, Modal, Card, etc.)
│   ├── layout/                 # Sidebar, Header, MobileNav
│   ├── charts/                 # Reusable chart wrappers
│   └── feedback/               # Loading, Error, Empty states
├── features/                   # Feature modules
│   ├── auth/                   # Login, Register, ForgotPassword
│   ├── dashboard/              # Dashboard widgets & layout
│   ├── transactions/           # Transaction CRUD, list, filters
│   ├── categories/             # Category management
│   ├── budgets/                # Budget tracking
│   ├── savings/                # Savings goals
│   ├── accounts/               # Account management
│   ├── recurring/              # Recurring transactions
│   ├── reports/                # Reports & analytics
│   ├── calendar/               # Calendar view
│   ├── notifications/          # Notification center
│   ├── search/                 # Global search
│   ├── export/                 # Export functionality
│   └── settings/               # User settings
├── hooks/                      # Shared custom hooks
├── lib/                        # Library configurations
│   ├── supabase.ts             # Supabase client
│   └── queryClient.ts          # React Query client
├── services/                   # API service layer
├── types/                      # Shared TypeScript types
│   ├── database.ts             # Supabase-generated types
│   └── index.ts                # App-level types
├── utils/                      # Utility functions
│   ├── currency.ts             # Currency formatting
│   ├── date.ts                 # Date formatting
│   └── validation.ts           # Shared Zod schemas
├── styles/                     # Global styles
│   └── index.css               # Tailwind directives + custom styles
└── main.tsx                    # Entry point
```

#### [NEW] Configuration files
- `vite.config.ts` — Vite config with path aliases, code splitting
- `tailwind.config.ts` — Custom theme (colors, typography, animations)
- `tsconfig.json` — Strict TypeScript config with path aliases
- `.env.example` — Required environment variables
- `.env.local` — (gitignored) Actual env values

---

### 2. Database Schema (Supabase PostgreSQL)

#### [NEW] `supabase/schema.sql`

Full normalized schema with the following tables:

| Table | Description | Key Fields |
|-------|-------------|------------|
| `profiles` | User profiles (extends auth.users) | id, full_name, avatar_url, default_currency, date_format, theme |
| `accounts` | Financial accounts | id, user_id, name, type (cash/bank/credit/e-wallet), balance, currency, icon, color, is_active |
| `categories` | Transaction categories | id, user_id, name, type (income/expense), icon, color, parent_id (for subcategories), is_default, sort_order |
| `transactions` | All financial transactions | id, user_id, date, amount, type (income/expense/transfer), category_id, subcategory_id, account_id, transfer_to_account_id, payment_method, merchant, notes, is_recurring, recurring_id |
| `tags` | Transaction tags | id, user_id, name, color |
| `transaction_tags` | Many-to-many join | transaction_id, tag_id |
| `attachments` | Receipt images | id, transaction_id, user_id, file_path, file_name, file_size, mime_type |
| `budgets` | Monthly budgets | id, user_id, category_id, amount, month, year |
| `savings_goals` | Savings goals | id, user_id, name, target_amount, current_amount, deadline, icon, color, is_completed |
| `recurring_transactions` | Recurring definitions | id, user_id, amount, type, category_id, account_id, frequency (weekly/monthly/quarterly/yearly), start_date, end_date, next_occurrence, is_active |
| `notifications` | User notifications | id, user_id, type, title, message, is_read, data (jsonb), created_at |
| `payment_methods` | Payment methods | id, user_id, name, icon |

**Indexes**: On user_id, date, category_id, account_id, type for all high-query tables.

**RLS Policies**: Every table will have RLS enabled with policies ensuring users can only access their own data:
```sql
CREATE POLICY "Users can only see own data" ON transactions
  FOR ALL USING (auth.uid() = user_id);
```

**Triggers**:
- Auto-create profile on user signup
- Auto-seed default categories on user signup
- Update account balance on transaction insert/update/delete
- Update savings goal progress on related transaction

---

### 3. Authentication Module

#### [NEW] `src/features/auth/`
- **LoginPage** — Email/password login with Google OAuth button
- **RegisterPage** — Email/password registration
- **ForgotPasswordPage** — Password reset flow
- **AuthGuard** — Protected route wrapper component
- **useAuth hook** — Auth state management, session handling
- **authService** — Supabase auth API calls

Features:
- Persistent sessions via Supabase
- Auto-redirect on auth state change
- Loading states during session check
- Form validation with Zod
- Beautiful, minimal auth UI (centered card, gradient background)

---

### 4. Layout & Navigation

#### [NEW] `src/components/layout/`
- **AppLayout** — Main app shell with sidebar + content area
- **Sidebar** — Collapsible navigation with icons (Dashboard, Transactions, Budgets, Savings, Accounts, Reports, Calendar, Settings)
- **Header** — Search bar, notifications bell, user avatar dropdown
- **MobileNav** — Bottom tab navigation for mobile
- **Breadcrumbs** — Context-aware breadcrumb navigation

Design:
- Sidebar: 240px wide, collapsible to 64px (icon-only), dark or light variant
- Smooth Framer Motion transitions between routes
- Glass-effect header on scroll
- Active route indicator with animated pill

---

### 5. Dashboard Module

#### [NEW] `src/features/dashboard/`

**Stat Cards** (top row):
- Current Balance (sum of all accounts)
- Monthly Income (this month)
- Monthly Expenses (this month)
- Savings (income - expenses)
- Budget Remaining
- Net Worth

Each card: animated counter, trend indicator (↑↓), percentage change from last month, subtle gradient background.

**Charts** (grid):
- **Expense Trend** — Area chart showing daily expenses for current month
- **Income vs Expense** — Bar chart comparing monthly income/expense (last 6 months)
- **Spending by Category** — Donut/pie chart with interactive legend
- **Monthly Comparison** — Grouped bar chart comparing this month vs last

**Lists**:
- **Recent Transactions** — Last 5 transactions with quick-view
- **Upcoming Bills** — Next 5 recurring transactions due

---

### 6. Transactions Module

#### [NEW] `src/features/transactions/`

**TransactionList**:
- TanStack Table with virtual scrolling
- Columns: Date, Description/Merchant, Category, Account, Amount, Actions
- Inline status badges (income = green, expense = red, transfer = blue)
- Row click → slide-out detail panel

**Filters**:
- Date range picker
- Type (Income/Expense/Transfer)
- Category multi-select
- Account multi-select
- Amount range
- Tags
- Payment method

**TransactionForm** (modal/drawer):
- All fields from spec (date, amount, type, category, subcategory, account, payment method, merchant, notes, tags)
- Receipt image upload with preview
- Drag-and-drop file upload
- Category picker with icons
- Tag input with autocomplete

**Actions**:
- Add, Edit, Delete (with confirmation), Duplicate
- Bulk selection + bulk delete
- Sort by any column

---

### 7. Categories Module

#### [NEW] `src/features/categories/`
- List all categories grouped by type (Income/Expense)
- Default categories seeded on signup (all from spec)
- Add custom categories with icon picker and color picker
- Edit/delete custom categories
- Subcategory support (parent → child relationship)
- Drag to reorder

---

### 8. Budgets Module

#### [NEW] `src/features/budgets/`
- Create monthly budget per category
- Visual progress bars (green → yellow → red as spending increases)
- Percentage spent indicator
- Remaining amount
- Overspending alert (toast notification + red highlight)
- Monthly budget overview with total budget vs total spent
- Copy last month's budget to current month

---

### 9. Savings Goals Module

#### [NEW] `src/features/savings/`
- Create savings goals (name, target amount, deadline, icon, color)
- Visual progress ring/bar
- Add contributions (links to transactions)
- Percentage completed
- Estimated completion date (calculated from contribution rate)
- Milestone celebrations (25%, 50%, 75%, 100% animations)
- Default examples: New Laptop, Vacation, Emergency Fund, House

---

### 10. Accounts Module

#### [NEW] `src/features/accounts/`
- Add multiple accounts (Cash, Wallet, Bank, Credit Card, E-Wallet)
- Individual balance display with icon and color
- Total net worth calculation
- Account-specific transaction history
- Transfer between accounts
- Archive/deactivate accounts

---

### 11. Recurring Transactions Module

#### [NEW] `src/features/recurring/`
- Create recurring transaction definitions
- Frequency: Weekly, Monthly, Quarterly, Yearly
- Start date, optional end date
- Auto-generate upcoming transactions (via Supabase edge function or client-side on login)
- View upcoming schedule
- Pause/resume recurring transactions
- Edit series vs single occurrence

---

### 12. Reports & Analytics Module

#### [NEW] `src/features/reports/`

**Time Ranges**: Daily, Weekly, Monthly, Quarterly, Yearly, Custom

**Charts**:
- Pie chart: Spending by category
- Bar chart: Income vs expenses over time
- Line chart: Balance/net worth trend
- Area chart: Savings trend

**Metrics**:
- Top spending categories (ranked list)
- Largest individual expenses
- Average daily spending
- Average monthly spending
- Income trends
- Expense trends
- Savings rate

**AI-style Insights** (rule-based analysis):
- "You spent 35% more on Food this month compared to last month"
- "Coffee spending increased by 18%"
- "Subscriptions cost $XX/month"
- "You can save $XXX annually by reducing dining out"
- Unusual spending detection (transactions > 2x category average)

---

### 13. Calendar View Module

#### [NEW] `src/features/calendar/`
- Monthly calendar grid showing transaction dots/amounts per day
- Color-coded by type (green = income, red = expense)
- Click date → show day's transactions in a drawer/popover
- Navigate months with smooth transitions
- Today indicator

---

### 14. Notifications Module

#### [NEW] `src/features/notifications/`
- In-app notification center (bell icon in header)
- Notification types: Budget exceeded, Upcoming bills, Recurring payment due, Savings milestone
- Mark as read / mark all as read
- Generated via Supabase triggers or client-side checks on dashboard load
- Notification badge count

---

### 15. Export Module

#### [NEW] `src/features/export/`
- Export transactions to CSV (native)
- Export to Excel (.xlsx via SheetJS)
- Export to PDF (via jsPDF with styled tables)
- Date range selection for export
- Include/exclude columns

---

### 16. Settings Module

#### [NEW] `src/features/settings/`
- **Currency**: Select default currency (with symbol/format preview)
- **Theme**: Light / Dark / System (persisted in profile + localStorage)
- **Date Format**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- **Profile**: Update name, avatar
- **Import**: CSV import with column mapping
- **Backup**: Export all data as JSON
- **Danger Zone**: Delete account

---

### 17. Global Search

#### [NEW] `src/features/search/`
- Command palette (Cmd/Ctrl + K) for global search
- Search across: Transactions, Categories, Merchants, Notes, Tags
- Debounced search (300ms)
- Grouped results with type indicators
- Keyboard navigation
- Recent searches

---

### 18. Shared UI Components

#### [NEW] `src/components/ui/`

| Component | Description |
|-----------|-------------|
| Button | Primary, secondary, ghost, danger variants with loading state |
| Input | Text, number, date inputs with label, error, helper text |
| Select | Custom styled select with search |
| Modal | Animated modal with backdrop |
| Drawer | Slide-out panel (right side) |
| Card | Elevated card with optional header/footer |
| Badge | Status badges with colors |
| Avatar | User avatar with fallback initials |
| Dropdown | Context menu / dropdown menu |
| Tabs | Animated tab navigation |
| Toggle | Switch toggle |
| Skeleton | Loading skeleton shapes |
| EmptyState | Illustrated empty states with CTA |
| ErrorBoundary | Graceful error handling |
| ConfirmDialog | Destructive action confirmation |
| DatePicker | Calendar date picker |
| ColorPicker | Color selection for categories |
| IconPicker | Icon selection for categories |
| ProgressBar | Animated progress bar |
| ProgressRing | Circular progress indicator |
| Tooltip | Hover tooltips |
| CommandPalette | Global search modal |

---

## UI Design System

### Color Palette (Dark Mode Primary)
```
Background:     hsl(220, 20%, 6%)      — Near-black with blue tint
Surface:        hsl(220, 18%, 10%)     — Card backgrounds
Surface Hover:  hsl(220, 16%, 14%)     — Interactive hover
Border:         hsl(220, 14%, 18%)     — Subtle borders
Text Primary:   hsl(0, 0%, 95%)        — White text
Text Secondary: hsl(220, 10%, 55%)     — Muted text
Accent:         hsl(250, 90%, 65%)     — Vibrant purple (primary)
Accent Hover:   hsl(250, 90%, 70%)     — Lighter purple
Success:        hsl(150, 70%, 45%)     — Green for income
Danger:         hsl(0, 75%, 55%)       — Red for expenses
Warning:        hsl(40, 90%, 55%)      — Amber for alerts
Info:           hsl(210, 80%, 55%)     — Blue for transfers
```

### Typography
- Font: **Inter** (from Google Fonts) — clean, modern, excellent readability
- Headings: Semi-bold (600), tight letter-spacing
- Body: Regular (400), relaxed line-height
- Monospace numbers: Tabular nums for financial data alignment

### Spacing & Layout
- Base unit: 4px
- Border radius: 8px (small), 12px (medium), 16px (large)
- Sidebar: 256px collapsed to 72px
- Content max-width: 1280px
- Card padding: 24px

---

## Performance Strategy

| Strategy | Implementation |
|----------|---------------|
| Code Splitting | `React.lazy()` for each route/feature |
| Data Caching | React Query with 5-min stale time |
| Optimistic Updates | Immediate UI update, rollback on error |
| Debounced Search | 300ms debounce on search inputs |
| Virtual Scrolling | TanStack Virtual for large transaction lists |
| Image Optimization | Compress receipts before upload, lazy load images |
| Pagination | Cursor-based pagination for transactions |
| Prefetching | Prefetch adjacent pages on hover |

---

## Security Strategy

| Layer | Implementation |
|-------|---------------|
| Authentication | Supabase Auth with JWT sessions |
| Authorization | Row Level Security on every table |
| Input Validation | Zod schemas on all form inputs |
| SQL Injection | Parameterized queries via Supabase SDK |
| XSS | React's built-in escaping + DOMPurify for user HTML |
| CSRF | Supabase handles via auth tokens |
| File Upload | Type/size validation, signed URLs for private files |
| Route Protection | AuthGuard HOC redirects unauthenticated users |

---

## Verification Plan

### Automated Tests
- TypeScript strict mode compilation: `npx tsc --noEmit`
- Lint check: `npx eslint src/`
- Build verification: `npm run build`

### Manual Verification
- Launch dev server and verify all routes render
- Test auth flow (login, register, forgot password)
- Test CRUD operations on transactions
- Verify charts render with sample data
- Test responsive layouts on mobile viewport
- Test dark/light theme switching
- Verify RLS policies in Supabase dashboard

### User Verification
- Deploy to Vercel/Netlify for staging
- Connect to Supabase project
- Test with real financial data

---

## Implementation Order

I will build this project in **8 phases**, each producing a working, testable increment:

| Phase | Modules | Estimated Scope |
|-------|---------|-----------------|
| 1 | Project setup, Tailwind, Auth, Database SQL, Layout | Foundation |
| 2 | Dashboard, Accounts, Shared UI components | Core views |
| 3 | Transactions (full CRUD, filters, search, receipts) | Primary feature |
| 4 | Categories, Budgets | Financial planning |
| 5 | Savings Goals, Recurring Transactions | Goals & automation |
| 6 | Reports, Charts, Analytics/Insights | Data visualization |
| 7 | Calendar, Notifications, Export, Global Search | Secondary features |
| 8 | Settings, Import, Polish, Performance, Documentation | Final polish |

---

## Deliverables Checklist

- [ ] Product Requirements Document (this plan)
- [ ] User Flow (in walkthrough)
- [ ] Database Schema SQL
- [ ] Supabase setup instructions
- [ ] API architecture (service layer)
- [ ] Folder structure
- [ ] UI component library
- [ ] Complete frontend implementation
- [ ] Backend implementation (schema + RLS + triggers)
- [ ] Authentication setup
- [ ] Charts and analytics
- [ ] Deployment guide
- [ ] Testing strategy
- [ ] Future roadmap
