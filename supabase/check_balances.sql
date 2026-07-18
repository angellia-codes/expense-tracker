-- Balance drift check for apply_transaction_to_balances().
-- Run in the Supabase SQL editor. Returns zero rows when every account's
-- stored balance matches its opening balance plus the ledger.
--
-- `opening` is inferred: whatever the balance was before any transactions.
-- Since the trigger is the only thing that moves balance, drift here means
-- either the trigger misfired or a balance was edited by hand.

WITH ledger AS (
    SELECT account_id AS id,
           SUM(CASE type WHEN 'income' THEN amount ELSE -amount END) AS delta
      FROM public.transactions
     WHERE account_id IS NOT NULL
     GROUP BY account_id
    UNION ALL
    SELECT transfer_to_account_id AS id,
           SUM(amount) AS delta
      FROM public.transactions
     WHERE type = 'transfer' AND transfer_to_account_id IS NOT NULL
     GROUP BY transfer_to_account_id
),
applied AS (
    SELECT id, SUM(delta) AS delta FROM ledger GROUP BY id
)
SELECT a.id,
       a.name,
       a.balance                            AS stored_balance,
       COALESCE(x.delta, 0)                 AS ledger_delta,
       a.balance - COALESCE(x.delta, 0)     AS implied_opening_balance
  FROM public.accounts a
  LEFT JOIN applied x ON x.id = a.id
 WHERE a.balance - COALESCE(x.delta, 0) < 0;   -- negative opening = likely drift
