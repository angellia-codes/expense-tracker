# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc -b (typecheck, strict) then vite build
npm run lint     # oxlint
node debug.cjs   # headless Chromium load of localhost:5173, prints console + page errors
```

No test runner is installed. `debug.cjs` (Playwright) is the only runtime check — start `npm run dev` first.

## Setup

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`); `src/lib/supabase.ts` throws at import time without them. `supabase/schema.sql` is the full DDL — tables, RLS policies, and triggers — applied by hand in the Supabase SQL editor. There is no migration tooling; edit `schema.sql` and re-apply.

## Architecture

Vite + React 19 + TS, Supabase (Postgres + Auth) as the only backend, TanStack Query for all server state. `@/` aliases `src/` (declared in both `vite.config.ts` and `tsconfig.app.json` — keep them in sync).

Entry chain: `main.tsx` → `app/App.tsx` → `app/providers.tsx` (QueryClient → AuthProvider → Sonner toaster) → `app/router.tsx`.

**Feature module pattern** — every feature under `src/features/<name>/` is three layers, and new features must follow it:

1. `<name>Service.ts` — plain async functions calling `supabase`. Each read does `supabase.auth.getUser()`, throws `'Not authenticated'` if absent, and filters `.eq('user_id', user.id)` even though RLS already enforces it. Exports `Create<X>DTO` / `Update<X>DTO` derived from the **Insert** type — `Omit<XInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>` — never from the Row type, or DB-defaulted columns become mandatory for callers and `id` leaks into update payloads.
2. `use<Name>.ts` — TanStack Query hooks wrapping the service. Mutations invalidate their own key **plus `['dashboard']`**, and surface success/error through `toast` from sonner. Errors are never thrown to the component.
3. `<Name>Page.tsx` / `<Name>FormModal.tsx` — UI. Forms use react-hook-form + `zodResolver` against schemas in `src/utils/validation.ts` (all Zod schemas live there, not beside the feature).

Query keys are flat string arrays (`['accounts']`, `['dashboard']`). Query defaults live in `src/lib/queryClient.ts` (5 min stale, no refetch on focus, 1 retry).

**Auth**: `features/auth/useAuth.tsx` holds a context with `user`/`session`/`profile`/`isLoading`/`isAuthenticated`, driven by `onAuthStateChange`. It also applies the theme class to `<html>` from `profile.theme`. `router.tsx` gates on it via `RequireAuth` / `PublicRoute`; unbuilt routes render a local `Placeholder`.

**Account balances are maintained by the database.** `apply_transaction_to_balances()` in `schema.sql` fires `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` on `transactions`: it reverses the OLD row's effect then applies the NEW one, covering account changes and transfers. **Never adjust `accounts.balance` from client code** — the trigger has already done it, and a manual write on top double-counts (this is exactly what the CSV importer got wrong). A bulk insert is not an exception; the trigger is per-row.

**Types**: `src/types/database.ts` mirrors the SQL schema and is hand-maintained (not generated) — update it whenever `schema.sql` changes, **including the `Relationships` array** on each table. supabase-js needs it to satisfy `GenericSchema`; omit it and the entire client silently degrades to `never`, which surfaces as nonsense errors far from the cause. `transactions` has two FKs to `accounts`, so embeds must hint the constraint: `account:accounts!transactions_account_id_fkey(*)`. `src/types/index.ts` re-exports those plus app-level view types (`TransactionWithRelations`, `DashboardSummary`, filters). Import from `@/types`.

**Bundle**: routes behind the login are lazy-loaded and `manualChunks` in `vite.config.ts` splits the heavy libs. recharts, xlsx and jspdf must not share a chunk (Rolldown OOMs rendering it). jspdf's own deps — `canvg`, `html2canvas`, `dompurify` — are named explicitly in the `export` chunk; left to the default they land in vendor and every page pays ~95 kB gzip for a PDF export most users never run. After touching chunking, run `npm run build` and check no `vendor-*` chunk holds something only one page uses.

## Styling

Tailwind v4 via `@tailwindcss/vite`, no config file. The design system is a `@theme` block of CSS variables in `src/styles/index.css` — dark is the base, `.light` on `<html>` overrides. Use semantic token classes (`bg-bg-elevated`, `text-text-secondary`, `border-border`) rather than raw palette colors. UI primitives in `src/components/ui/` are CVA-based with `cn()` from `@/utils/cn`; dialogs wrap Radix.

Note: `src/index.css` is leftover Vite template CSS and is not imported — `main.tsx` loads `src/styles/index.css`.

**Never add plain (unlayered) CSS that targets `*` or bare elements** to `src/styles/index.css`. `@import "tailwindcss"` puts every utility inside `@layer utilities`, and unlayered CSS wins over layered CSS regardless of specificity or order — so a hand-rolled `* { margin: 0; padding: 0 }` silently cancels every `p-*`, `m-*` and `space-*` class app-wide (this was a real bug). Preflight already covers that reset. If you need a genuine global, scope it to a selector or put it in `@layer base`.

## Progress tracking

`task.md` is the live checklist; `implementation_plan.md` is the full spec for the remaining phases (budgets, savings, recurring, reports, calendar, export, settings). Update `task.md` checkboxes as modules land.
