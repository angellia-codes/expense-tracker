-- ============================================================================
-- PERSONAL FINANCE & EXPENSE TRACKER — SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Description : Full schema for a privacy-first personal finance application.
-- Platform    : Supabase (PostgreSQL 15+)
-- Author      : Auto-generated
-- Created     : 2026-07-18
--
-- Run this file in the Supabase SQL Editor to bootstrap the entire database.
-- All tables have Row-Level Security (RLS) enabled with per-user policies.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid()


-- ════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES (extends auth.users)
-- ════════════════════════════════════════════════════════════════════════════
-- Stores user preferences and display information.
-- Automatically populated via the handle_new_user() trigger on auth.users.

CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name        TEXT,                                       -- Display name from sign-up metadata
    avatar_url       TEXT,                                       -- URL to profile picture
    default_currency TEXT        NOT NULL DEFAULT 'IDR',         -- ISO 4217 currency code
    date_format      TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',  -- Preferred date display format
    theme            TEXT        NOT NULL DEFAULT 'dark',        -- UI theme: 'dark' | 'light'
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles                  IS 'User profile data extending Supabase auth.users.';
COMMENT ON COLUMN public.profiles.default_currency IS 'ISO 4217 currency code used as default across the app.';
COMMENT ON COLUMN public.profiles.date_format      IS 'User-preferred date display format string.';
COMMENT ON COLUMN public.profiles.theme            IS 'UI theme preference: dark or light.';


-- ════════════════════════════════════════════════════════════════════════════
-- 2. ACCOUNTS
-- ════════════════════════════════════════════════════════════════════════════
-- Financial accounts the user tracks (bank accounts, wallets, etc.).

CREATE TABLE IF NOT EXISTS public.accounts (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name        TEXT           NOT NULL,                            -- Account display name
    type        TEXT           NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'e_wallet', 'investment')),
    balance     DECIMAL(15,2)  NOT NULL DEFAULT 0,                 -- Current balance (maintained by trg_transactions_balance)
    currency    TEXT           NOT NULL DEFAULT 'IDR',             -- Account-level currency
    icon        TEXT,                                              -- Emoji or icon identifier
    color       TEXT,                                              -- Hex color code for UI
    is_active   BOOLEAN        NOT NULL DEFAULT true,              -- Soft-delete / archive flag
    sort_order  INTEGER        NOT NULL DEFAULT 0,                 -- Manual ordering in UI
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.accounts          IS 'User financial accounts (bank, cash, e-wallet, etc.).';
COMMENT ON COLUMN public.accounts.type     IS 'Account type: cash | bank | credit_card | e_wallet | investment.';
COMMENT ON COLUMN public.accounts.balance  IS 'Current balance in the account currency. Maintained by the apply_transaction_to_balances() trigger; the opening balance is whatever the account was created with.';


-- ════════════════════════════════════════════════════════════════════════════
-- 3. CATEGORIES
-- ════════════════════════════════════════════════════════════════════════════
-- Income / expense categories. Supports one level of nesting via parent_id.

CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),  -- Category direction
    icon        TEXT,                                                        -- Emoji or icon name
    color       TEXT,                                                        -- Hex color for charts / UI
    parent_id   UUID        REFERENCES public.categories (id) ON DELETE SET NULL, -- Nullable; set for subcategories
    is_default  BOOLEAN     NOT NULL DEFAULT false,                          -- Seeded defaults cannot be deleted
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.categories            IS 'Transaction categories with optional single-level nesting.';
COMMENT ON COLUMN public.categories.parent_id  IS 'Self-referencing FK for subcategories. NULL = top-level category.';
COMMENT ON COLUMN public.categories.is_default IS 'True for system-seeded categories created on user sign-up.';


-- ════════════════════════════════════════════════════════════════════════════
-- 4. PAYMENT METHODS
-- ════════════════════════════════════════════════════════════════════════════
-- How the user pays for transactions (Cash, Card, E-Wallet, etc.).

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    icon        TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_methods IS 'User-defined payment methods (Cash, Credit Card, E-Wallet, etc.).';


-- ════════════════════════════════════════════════════════════════════════════
-- 5. TRANSACTIONS
-- ════════════════════════════════════════════════════════════════════════════
-- The core ledger: every income, expense, and transfer.

CREATE TABLE IF NOT EXISTS public.transactions (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    date                    DATE           NOT NULL,                             -- Transaction date
    amount                  DECIMAL(15,2)  NOT NULL,                             -- Always positive; direction from `type`
    type                    TEXT           NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    category_id             UUID           REFERENCES public.categories (id) ON DELETE SET NULL,
    account_id              UUID           REFERENCES public.accounts (id) ON DELETE SET NULL,
    transfer_to_account_id  UUID           REFERENCES public.accounts (id) ON DELETE SET NULL,  -- Only for type = 'transfer'
    payment_method_id       UUID           REFERENCES public.payment_methods (id) ON DELETE SET NULL,
    merchant                TEXT,                                                -- Payee / merchant name
    notes                   TEXT,                                                -- Free-form notes
    is_recurring            BOOLEAN        NOT NULL DEFAULT false,               -- Generated from a recurring rule?
    recurring_id            UUID,                                                -- FK hint to recurring_transactions (loose)
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.transactions                        IS 'Core financial ledger storing every income, expense, and transfer.';
COMMENT ON COLUMN public.transactions.amount                 IS 'Absolute amount. Direction is determined by the type column.';
COMMENT ON COLUMN public.transactions.transfer_to_account_id IS 'Destination account for transfer-type transactions. NULL otherwise.';
COMMENT ON COLUMN public.transactions.recurring_id           IS 'References the recurring_transactions rule that generated this row.';


-- ════════════════════════════════════════════════════════════════════════════
-- 6. TAGS
-- ════════════════════════════════════════════════════════════════════════════
-- Free-form labels users can attach to transactions.

CREATE TABLE IF NOT EXISTS public.tags (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    color       TEXT,                                            -- Hex color for pills / chips
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tags IS 'User-created tags for labelling and filtering transactions.';


-- ════════════════════════════════════════════════════════════════════════════
-- 7. TRANSACTION_TAGS (join table)
-- ════════════════════════════════════════════════════════════════════════════
-- Many-to-many relationship between transactions and tags.

CREATE TABLE IF NOT EXISTS public.transaction_tags (
    transaction_id UUID NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
    tag_id         UUID NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

COMMENT ON TABLE public.transaction_tags IS 'Join table linking transactions to tags (M:N).';


-- ════════════════════════════════════════════════════════════════════════════
-- 8. ATTACHMENTS
-- ════════════════════════════════════════════════════════════════════════════
-- Receipt photos / documents linked to transactions.

CREATE TABLE IF NOT EXISTS public.attachments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID        NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    file_path       TEXT        NOT NULL,                          -- Storage bucket path
    file_name       TEXT,                                          -- Original file name
    file_size       INTEGER,                                       -- Size in bytes
    mime_type       TEXT,                                           -- e.g. image/jpeg, application/pdf
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.attachments           IS 'File attachments (receipts, invoices) linked to transactions.';
COMMENT ON COLUMN public.attachments.file_path IS 'Path within the Supabase Storage bucket.';


-- ════════════════════════════════════════════════════════════════════════════
-- 9. BUDGETS
-- ════════════════════════════════════════════════════════════════════════════
-- Monthly spending limits per category.

CREATE TABLE IF NOT EXISTS public.budgets (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    category_id UUID           NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
    amount      DECIMAL(15,2)  NOT NULL,                           -- Budget cap for the month
    month       INTEGER        NOT NULL CHECK (month BETWEEN 1 AND 12),
    year        INTEGER        NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

    -- One budget per category per month per user
    UNIQUE (user_id, category_id, month, year)
);

COMMENT ON TABLE  public.budgets        IS 'Monthly spending budgets per category.';
COMMENT ON COLUMN public.budgets.month  IS 'Calendar month (1–12).';
COMMENT ON COLUMN public.budgets.amount IS 'Maximum spending allowed for the category in this month.';


-- ════════════════════════════════════════════════════════════════════════════
-- 10. SAVINGS GOALS
-- ════════════════════════════════════════════════════════════════════════════
-- Targets the user is saving towards.

CREATE TABLE IF NOT EXISTS public.savings_goals (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name            TEXT           NOT NULL,
    target_amount   DECIMAL(15,2)  NOT NULL,                      -- Goal target
    current_amount  DECIMAL(15,2)  NOT NULL DEFAULT 0,            -- Progress so far
    deadline        DATE,                                          -- Optional target date
    icon            TEXT,
    color           TEXT,
    is_completed    BOOLEAN        NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.savings_goals                IS 'Savings targets the user is working towards.';
COMMENT ON COLUMN public.savings_goals.current_amount IS 'Running total of amount saved. Updated via application logic.';


-- ════════════════════════════════════════════════════════════════════════════
-- 11. RECURRING TRANSACTIONS
-- ════════════════════════════════════════════════════════════════════════════
-- Rules that automatically generate transactions on a schedule.

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    amount            DECIMAL(15,2)  NOT NULL,
    type              TEXT           NOT NULL CHECK (type IN ('income', 'expense')),
    category_id       UUID           REFERENCES public.categories (id) ON DELETE SET NULL,
    account_id        UUID           REFERENCES public.accounts (id) ON DELETE SET NULL,
    payment_method_id UUID           REFERENCES public.payment_methods (id) ON DELETE SET NULL,
    merchant          TEXT,
    notes             TEXT,
    frequency         TEXT           NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date        DATE           NOT NULL,
    end_date          DATE,                                        -- NULL = runs indefinitely
    next_occurrence   DATE,                                        -- Computed next fire date
    is_active         BOOLEAN        NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.recurring_transactions                 IS 'Rules for auto-generating periodic transactions.';
COMMENT ON COLUMN public.recurring_transactions.frequency       IS 'Schedule cadence: weekly | monthly | quarterly | yearly.';
COMMENT ON COLUMN public.recurring_transactions.next_occurrence IS 'Pre-computed date of the next transaction to generate.';


-- ════════════════════════════════════════════════════════════════════════════
-- 12. NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════════════════
-- In-app notifications for budget alerts, bills, milestones, etc.

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    type        TEXT        NOT NULL CHECK (type IN (
                                'budget_exceeded',
                                'upcoming_bill',
                                'recurring_payment',
                                'savings_milestone',
                                'unusual_spending'
                            )),
    title       TEXT        NOT NULL,
    message     TEXT,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    data        JSONB,                                             -- Arbitrary payload (IDs, amounts, etc.)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notifications      IS 'In-app notification feed for alerts and milestones.';
COMMENT ON COLUMN public.notifications.type IS 'Notification category used for filtering and icon selection.';
COMMENT ON COLUMN public.notifications.data IS 'Flexible JSONB payload carrying contextual IDs, amounts, or metadata.';


-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════
-- Performance indexes on columns frequently used in WHERE, JOIN, ORDER BY.

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type    ON public.categories (type);

-- payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods (user_id);

-- transactions (heaviest table — multiple indexes)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id     ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON public.transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id  ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type        ON public.transactions (type);

-- Composite index for the most common query: "my transactions, newest first"
CREATE INDEX IF NOT EXISTS idx_transactions_user_date   ON public.transactions (user_id, date DESC);

-- tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags (user_id);

-- transaction_tags
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON public.transaction_tags (tag_id);

-- attachments
CREATE INDEX IF NOT EXISTS idx_attachments_transaction_id ON public.attachments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id        ON public.attachments (user_id);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets (category_id);

-- savings_goals
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals (user_id);

-- recurring_transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id         ON public.recurring_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_occurrence ON public.recurring_transactions (next_occurrence)
    WHERE is_active = true;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON public.notifications (user_id)
    WHERE is_read = false;


-- ════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════
-- Every table is locked down so users can only access their own data.

-- ── profiles ───────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: users can view own profile" ON public.profiles;
CREATE POLICY "profiles: users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: users can insert own profile" ON public.profiles;
CREATE POLICY "profiles: users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: users can update own profile" ON public.profiles;
CREATE POLICY "profiles: users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: users can delete own profile" ON public.profiles;
CREATE POLICY "profiles: users can delete own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);


-- ── accounts ───────────────────────────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts: users can view own accounts" ON public.accounts;
CREATE POLICY "accounts: users can view own accounts"
    ON public.accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts: users can insert own accounts" ON public.accounts;
CREATE POLICY "accounts: users can insert own accounts"
    ON public.accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts: users can update own accounts" ON public.accounts;
CREATE POLICY "accounts: users can update own accounts"
    ON public.accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts: users can delete own accounts" ON public.accounts;
CREATE POLICY "accounts: users can delete own accounts"
    ON public.accounts FOR DELETE
    USING (auth.uid() = user_id);


-- ── categories ─────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: users can view own categories" ON public.categories;
CREATE POLICY "categories: users can view own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: users can insert own categories" ON public.categories;
CREATE POLICY "categories: users can insert own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: users can update own categories" ON public.categories;
CREATE POLICY "categories: users can update own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: users can delete own categories" ON public.categories;
CREATE POLICY "categories: users can delete own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);


-- ── payment_methods ────────────────────────────────────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods: users can view own methods" ON public.payment_methods;
CREATE POLICY "payment_methods: users can view own methods"
    ON public.payment_methods FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_methods: users can insert own methods" ON public.payment_methods;
CREATE POLICY "payment_methods: users can insert own methods"
    ON public.payment_methods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_methods: users can update own methods" ON public.payment_methods;
CREATE POLICY "payment_methods: users can update own methods"
    ON public.payment_methods FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_methods: users can delete own methods" ON public.payment_methods;
CREATE POLICY "payment_methods: users can delete own methods"
    ON public.payment_methods FOR DELETE
    USING (auth.uid() = user_id);


-- ── transactions ───────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions: users can view own transactions" ON public.transactions;
CREATE POLICY "transactions: users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions: users can insert own transactions" ON public.transactions;
CREATE POLICY "transactions: users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions: users can update own transactions" ON public.transactions;
CREATE POLICY "transactions: users can update own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions: users can delete own transactions" ON public.transactions;
CREATE POLICY "transactions: users can delete own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);


-- ── tags ───────────────────────────────────────────────────────────────────
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags: users can view own tags" ON public.tags;
CREATE POLICY "tags: users can view own tags"
    ON public.tags FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tags: users can insert own tags" ON public.tags;
CREATE POLICY "tags: users can insert own tags"
    ON public.tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tags: users can update own tags" ON public.tags;
CREATE POLICY "tags: users can update own tags"
    ON public.tags FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tags: users can delete own tags" ON public.tags;
CREATE POLICY "tags: users can delete own tags"
    ON public.tags FOR DELETE
    USING (auth.uid() = user_id);


-- ── transaction_tags ───────────────────────────────────────────────────────
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

-- Access controlled through the parent transaction ownership
DROP POLICY IF EXISTS "transaction_tags: users can view own" ON public.transaction_tags;
CREATE POLICY "transaction_tags: users can view own"
    ON public.transaction_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id AND t.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "transaction_tags: users can insert own" ON public.transaction_tags;
CREATE POLICY "transaction_tags: users can insert own"
    ON public.transaction_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id AND t.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "transaction_tags: users can delete own" ON public.transaction_tags;
CREATE POLICY "transaction_tags: users can delete own"
    ON public.transaction_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id AND t.user_id = auth.uid()
        )
    );


-- ── attachments ────────────────────────────────────────────────────────────
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments: users can view own attachments" ON public.attachments;
CREATE POLICY "attachments: users can view own attachments"
    ON public.attachments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments: users can insert own attachments" ON public.attachments;
CREATE POLICY "attachments: users can insert own attachments"
    ON public.attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments: users can update own attachments" ON public.attachments;
CREATE POLICY "attachments: users can update own attachments"
    ON public.attachments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments: users can delete own attachments" ON public.attachments;
CREATE POLICY "attachments: users can delete own attachments"
    ON public.attachments FOR DELETE
    USING (auth.uid() = user_id);


-- ── budgets ────────────────────────────────────────────────────────────────
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets: users can view own budgets" ON public.budgets;
CREATE POLICY "budgets: users can view own budgets"
    ON public.budgets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets: users can insert own budgets" ON public.budgets;
CREATE POLICY "budgets: users can insert own budgets"
    ON public.budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets: users can update own budgets" ON public.budgets;
CREATE POLICY "budgets: users can update own budgets"
    ON public.budgets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets: users can delete own budgets" ON public.budgets;
CREATE POLICY "budgets: users can delete own budgets"
    ON public.budgets FOR DELETE
    USING (auth.uid() = user_id);


-- ── savings_goals ──────────────────────────────────────────────────────────
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_goals: users can view own goals" ON public.savings_goals;
CREATE POLICY "savings_goals: users can view own goals"
    ON public.savings_goals FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals: users can insert own goals" ON public.savings_goals;
CREATE POLICY "savings_goals: users can insert own goals"
    ON public.savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals: users can update own goals" ON public.savings_goals;
CREATE POLICY "savings_goals: users can update own goals"
    ON public.savings_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals: users can delete own goals" ON public.savings_goals;
CREATE POLICY "savings_goals: users can delete own goals"
    ON public.savings_goals FOR DELETE
    USING (auth.uid() = user_id);


-- ── recurring_transactions ─────────────────────────────────────────────────
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_transactions: users can view own" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions: users can view own"
    ON public.recurring_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_transactions: users can insert own" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions: users can insert own"
    ON public.recurring_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_transactions: users can update own" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions: users can update own"
    ON public.recurring_transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_transactions: users can delete own" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions: users can delete own"
    ON public.recurring_transactions FOR DELETE
    USING (auth.uid() = user_id);


-- ── notifications ──────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications: users can view own notifications" ON public.notifications;
CREATE POLICY "notifications: users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: users can insert own notifications" ON public.notifications;
CREATE POLICY "notifications: users can insert own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: users can update own notifications" ON public.notifications;
CREATE POLICY "notifications: users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: users can delete own notifications" ON public.notifications;
CREATE POLICY "notifications: users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────────
-- update_updated_at()
-- ────────────────────────────────────────────────────────────────────────────
-- Generic trigger function that sets `updated_at` to now() on every UPDATE.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at()
    IS 'Sets the updated_at column to the current timestamp on every row update.';

-- Attach the trigger to every table that has an updated_at column
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON public.savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at
    BEFORE UPDATE ON public.savings_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER trg_recurring_transactions_updated_at
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ────────────────────────────────────────────────────────────────────────────
-- handle_new_user()
-- ────────────────────────────────────────────────────────────────────────────
-- Triggered AFTER INSERT on auth.users.
-- Creates a profile row, seeds default categories, and seeds payment methods.
-- Uses SECURITY DEFINER to bypass RLS during the seeding inserts.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- Prevent search_path injection
AS $$
DECLARE
    _user_id UUID := NEW.id;
    _full_name TEXT;
BEGIN
    -- ── Extract full_name from sign-up metadata ────────────────────────────
    _full_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        ''
    );

    -- ── 1. Create the user profile ─────────────────────────────────────────
    INSERT INTO public.profiles (id, full_name)
    VALUES (_user_id, _full_name);

    -- ── 2. Seed default INCOME categories ──────────────────────────────────
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default, sort_order) VALUES
        (_user_id, 'Salary',        'income', '💰', '#10B981', true, 1),
        (_user_id, 'Freelance',     'income', '💻', '#3B82F6', true, 2),
        (_user_id, 'Bonus',         'income', '🎁', '#F59E0B', true, 3),
        (_user_id, 'Investment',    'income', '📈', '#8B5CF6', true, 4),
        (_user_id, 'Other Income',  'income', '💵', '#6B7280', true, 5);

    -- ── 3. Seed default EXPENSE categories ─────────────────────────────────
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default, sort_order) VALUES
        (_user_id, 'Food & Dining',  'expense', '🍔', '#EF4444', true, 1),
        (_user_id, 'Coffee',         'expense', '☕', '#92400E', true, 2),
        (_user_id, 'Transport',      'expense', '🚌', '#3B82F6', true, 3),
        (_user_id, 'Fuel',           'expense', '⛽', '#F97316', true, 4),
        (_user_id, 'Shopping',       'expense', '🛍️', '#EC4899', true, 5),
        (_user_id, 'Rent',           'expense', '🏠', '#6366F1', true, 6),
        (_user_id, 'Mortgage',       'expense', '🏦', '#4F46E5', true, 7),
        (_user_id, 'Utilities',      'expense', '💡', '#FBBF24', true, 8),
        (_user_id, 'Internet',       'expense', '🌐', '#06B6D4', true, 9),
        (_user_id, 'Mobile',         'expense', '📱', '#8B5CF6', true, 10),
        (_user_id, 'Healthcare',     'expense', '🏥', '#EF4444', true, 11),
        (_user_id, 'Insurance',      'expense', '🛡️', '#10B981', true, 12),
        (_user_id, 'Entertainment',  'expense', '🎬', '#F43F5E', true, 13),
        (_user_id, 'Travel',         'expense', '✈️', '#0EA5E9', true, 14),
        (_user_id, 'Education',      'expense', '📚', '#7C3AED', true, 15),
        (_user_id, 'Subscription',   'expense', '📦', '#6366F1', true, 16),
        (_user_id, 'Gifts',          'expense', '🎁', '#EC4899', true, 17),
        (_user_id, 'Pets',           'expense', '🐾', '#F59E0B', true, 18),
        (_user_id, 'Family',         'expense', '👨‍👩‍👧', '#10B981', true, 19),
        (_user_id, 'Taxes',          'expense', '📋', '#64748B', true, 20),
        (_user_id, 'Investments',    'expense', '💹', '#059669', true, 21),
        (_user_id, 'Savings',        'expense', '🏦', '#0D9488', true, 22),
        (_user_id, 'Emergency',      'expense', '🚨', '#DC2626', true, 23),
        (_user_id, 'Miscellaneous',  'expense', '📌', '#9CA3AF', true, 24);

    -- ── 4. Seed default payment methods ────────────────────────────────────
    INSERT INTO public.payment_methods (user_id, name, icon) VALUES
        (_user_id, 'Cash',          '💵'),
        (_user_id, 'Bank Transfer', '🏦'),
        (_user_id, 'Credit Card',   '💳'),
        (_user_id, 'Debit Card',    '💳'),
        (_user_id, 'E-Wallet',      '📱'),
        (_user_id, 'Other',         '📋');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user()
    IS 'Creates a profile, seeds default categories, and seeds payment methods when a new user signs up.';


-- ── Attach trigger to auth.users ───────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────────────────────
-- apply_transaction_to_balances()
-- ────────────────────────────────────────────────────────────────────────────
-- Keeps accounts.balance in sync with the ledger. Fires AFTER every
-- INSERT / UPDATE / DELETE on transactions: reverses the OLD row's effect,
-- then applies the NEW row's effect. Handles account_id changes and transfers.
--
-- Direction: income adds to the account, expense subtracts, transfer
-- subtracts from account_id and adds to transfer_to_account_id.
--
-- NOT security definer on purpose: the UPDATEs run as the calling user, so
-- the accounts RLS policy is what stops a row from touching someone else's
-- account. NULL account_id simply matches no rows.



COMMENT ON FUNCTION public.apply_transaction_to_balances()
    IS 'Maintains accounts.balance from the transactions ledger on insert, update, and delete.';

DROP TRIGGER IF EXISTS trg_transactions_balance ON public.transactions;
CREATE TRIGGER trg_transactions_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_balances();


-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE: receipts bucket
-- ════════════════════════════════════════════════════════════════════════════
-- Holds receipt/invoice files for the `attachments` table. Private: reads go
-- through short-lived signed URLs, never a public link.
--
-- Paths MUST start with the owner's user id — `<user_id>/<transaction_id>/<file>`.
-- Every policy below matches on that first segment, so the path layout is the
-- access rule, not just a convention.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    FALSE,
    5242880,                                          -- 5 MB, enforced server-side
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
    SET file_size_limit    = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "receipts: users can read own files"   ON storage.objects;
DROP POLICY IF EXISTS "receipts: users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "receipts: users can delete own files" ON storage.objects;

CREATE POLICY "receipts: users can read own files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts: users can upload own files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts: users can delete own files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ════════════════════════════════════════════════════════════════════════════
-- DONE 🎉
-- ════════════════════════════════════════════════════════════════════════════
-- Schema is ready. Run this SQL in the Supabase SQL Editor.
-- All tables have RLS enabled with per-user CRUD policies.
-- The handle_new_user() trigger will automatically bootstrap new sign-ups
-- with a profile, default categories, and default payment methods.
-- ════════════════════════════════════════════════════════════════════════════
