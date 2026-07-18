# Expense Tracker

A personal finance app — transactions, accounts, budgets, savings goals, recurring bills,
reports and a calendar view. React 19 + TypeScript on the front, Supabase (Postgres + Auth)
as the only backend.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the two values below
npm run dev                    # http://localhost:5173
```

`.env.local` needs:

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | same page, the `anon` / public key |

`src/lib/supabase.ts` throws at import time if either is missing, so the app won't start
without them.

**Database.** There is no migration tooling. `supabase/schema.sql` is the complete DDL —
tables, row-level security policies and triggers. Paste it into the Supabase SQL editor and
run it. To change the schema, edit that file and re-apply it, then update
`src/types/database.ts` to match (it is hand-written, not generated).

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b (strict typecheck) then vite build
npm run lint     # oxlint
node debug.cjs   # headless Chromium load of localhost:5173; prints console + page errors
node --experimental-strip-types scripts/csv.check.ts   # CSV parser self-check
```

No test runner is installed. `debug.cjs` is the runtime smoke check — start the dev server
first.

## Architecture

```
main.tsx → app/App.tsx → app/providers.tsx → app/router.tsx
                         (QueryClient → AuthProvider → Sonner toaster)
```

`@/` aliases `src/`, declared in both `vite.config.ts` and `tsconfig.app.json` — keep the two
in sync.

**Feature modules.** Everything under `src/features/<name>/` follows the same three layers:

1. `<name>Service.ts` — plain async functions over the `supabase` client. Every read calls
   `supabase.auth.getUser()`, throws `'Not authenticated'` if there is no session, and filters
   on `user_id` even though RLS already enforces it.
2. `use<Name>.ts` — TanStack Query hooks. Mutations invalidate their own key **plus
   `['dashboard']`**, and report success or failure via `toast`. Errors never reach the
   component as throws.
3. `<Name>Page.tsx` / `<Name>FormModal.tsx` — UI. Forms are react-hook-form + `zodResolver`
   against schemas in `src/utils/validation.ts` (all Zod schemas live there, not next to the
   feature).

Query keys are flat string arrays (`['accounts']`, `['dashboard']`). Defaults — 5 minute stale
time, no refetch on focus, one retry — are in `src/lib/queryClient.ts`.

**Auth.** `features/auth/useAuth.tsx` exposes `user` / `session` / `profile` / `isLoading` /
`isAuthenticated` from a context driven by `onAuthStateChange`. It also applies the theme class
to `<html>` from `profile.theme`. `router.tsx` gates routes with `RequireAuth` / `PublicRoute`.

**Types.** `src/types/database.ts` mirrors the SQL schema by hand. Update it whenever
`schema.sql` changes, **including each table's `Relationships` array** — supabase-js needs it to
satisfy `GenericSchema`, and omitting it silently degrades the whole client to `never`, which
surfaces as confusing errors far from the cause. `transactions` has two foreign keys to
`accounts`, so embeds must name the constraint:
`account:accounts!transactions_account_id_fkey(*)`. Import from `@/types`.

### Account balances are the database's job

`accounts.balance` is maintained by the `apply_transaction_to_balances()` trigger in
`schema.sql`, which fires `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` on
`transactions`. It reverses the old row's effect and applies the new one, so account changes and
transfers are handled in one place.

**Never write `accounts.balance` from client code.** The trigger has already applied the
movement; adding your own on top double-counts it. Bulk inserts are not an exception — the
trigger is per-row, so one `.insert([...])` of 200 rows fires it 200 times.

### Receipts

Receipt files live in the private `receipts` storage bucket, one row per file in `attachments`.
Storage paths are `<user_id>/<transaction_id>/<uuid>-<filename>`, and the bucket policies match
on that first segment — the path layout *is* the access rule, so don't restructure it. Reads go
through short-lived signed URLs. The bucket caps uploads at 5 MB and restricts MIME types
server-side; `validateReceipt()` mirrors both client-side only to fail fast with a better
message.

Deleting a transaction cascades the `attachments` rows, but storage knows nothing about it —
`transactionsService.deleteTransaction` removes the files first, while the paths are still
readable.

## Styling

Tailwind v4 through `@tailwindcss/vite`; there is no `tailwind.config`. The design system is a
`@theme` block of CSS variables in `src/styles/index.css`. Dark is the base theme and `.light`
on `<html>` overrides it. Use semantic token classes (`bg-bg-elevated`, `text-text-secondary`,
`border-border`) rather than raw palette colours. UI primitives in `src/components/ui/` are
CVA-based and use `cn()` from `@/utils/cn`; dialogs wrap Radix.

`src/index.css` is leftover Vite template CSS and is not imported — `main.tsx` loads
`src/styles/index.css`.

## Bundle

Routes behind the login are lazy-loaded, and `manualChunks` in `vite.config.ts` splits the heavy
libraries out. Two things there are load-bearing:

- recharts, xlsx and jspdf must not share a chunk — Rolldown runs out of memory rendering it.
- jspdf's dependencies (`canvg`, `html2canvas`, `dompurify`) are listed explicitly in the
  `export` chunk. Left to the default they land in a vendor chunk, and every page pays roughly
  95 kB gzip for a PDF export most users never trigger.

After changing chunking, run `npm run build` and check that no `vendor-*` chunk contains
something only one page uses.

## Progress

`task.md` is the live checklist. `implementation_plan.md` is the original full spec.
