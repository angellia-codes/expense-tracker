# Expense Tracker — Build Progress

## Phase 1: Foundation
- [x] Initialize Vite + React + TypeScript project
- [x] Install all dependencies
- [x] Configure Tailwind CSS v4
- [x] Set up environment variables
- [x] Create folder structure
- [x] Configure path aliases
- [x] Create Supabase client
- [x] Create database schema SQL
- [x] Build shared UI components
- [x] Build authentication module
- [x] Build app layout (Sidebar, Header, MobileNav)
- [x] Set up routing with protected routes

## Phase 2: Core Views
- [x] Dashboard stat cards
- [x] Dashboard charts (placeholder)
- [x] Accounts management
- [x] Dashboard recent transactions & upcoming bills

## Phase 3: Transactions
- [x] Transaction list with table
- [x] Transaction filters and sorting
- [x] Add/Edit transaction form
- [x] Categories management (nested)
- [x] Receipt image upload (private `receipts` bucket, signed-URL viewing, attach on create or edit)
- [x] Payment method on transactions (seeded per signup; read-only list, no management UI)

## Phase 4: Categories & Budgets
- [x] Category management (built in Phase 3)
- [x] Budget creation and tracking
- [x] Budget progress visualization

## Phase 5: Savings & Recurring
- [x] Savings goals
- [x] Recurring transactions (manual posting; no scheduler yet)

## Phase 6: Reports & Analytics
- [x] Report generation with charts (range presets + custom, bar/pie/area via Recharts)
- [x] Analytics insights engine (rule-based, compares against previous equal-length period)
- [x] Dashboard cash flow chart (replaces Phase 6 placeholder)

## Phase 7: Secondary Features
- [x] Calendar view (month grid, day drill-down)
- [x] Notifications (derived client-side from budgets/recurring/savings; dismissals in localStorage)
- [x] Export (CSV, Excel, PDF — lazy-loaded, exports the currently filtered rows)
- [x] Global search (Cmd+K palette over transactions, categories, pages)

## Phase 8: Polish
- [x] Settings page (profile, currency, date format, theme, JSON backup, danger zone)
- [x] Import functionality (CSV, matches accounts/categories by name, per-row errors)
- [x] Performance optimization (routes lazy-loaded; jspdf's deps moved out of vendor, ~100kB gzip off first load; dropped unused deps)
- [x] Documentation (README: setup, architecture, balance caveat, chunking rules)
