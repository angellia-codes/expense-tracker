import { supabase } from '@/lib/supabase'
import { getNextOccurrence, toISODate } from '@/utils/date'
import type { Account, Category, RecurringTransaction, RecurringTransactionInsert } from '@/types'

export type CreateRecurringDTO = Omit<RecurringTransactionInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateRecurringDTO = Partial<CreateRecurringDTO>

export interface RecurringWithRelations extends RecurringTransaction {
  category?: Category | null
  account?: Account | null
}

/** A rule is due when it's active and its next occurrence has arrived (or passed). */
export function isDue(rule: RecurringTransaction, today = toISODate(new Date())): boolean {
  if (!rule.is_active || !rule.next_occurrence) return false
  if (rule.end_date && rule.next_occurrence > rule.end_date) return false
  return rule.next_occurrence <= today
}

export const recurringService = {
  async getRecurring(): Promise<RecurringWithRelations[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('next_occurrence', { ascending: true })

    if (error) throw error
    return data as RecurringWithRelations[]
  },

  async createRecurring(rule: CreateRecurringDTO): Promise<RecurringTransaction> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({
        ...rule,
        user_id: user.id,
        // First run is the start date; posting advances it from there.
        next_occurrence: rule.next_occurrence ?? rule.start_date,
      })
      .select()
      .single()

    if (error) throw error
    return data as RecurringTransaction
  },

  async updateRecurring(id: string, updates: UpdateRecurringDTO): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as RecurringTransaction
  },

  /**
   * Write the due occurrence into the ledger and advance the rule.
   *
   * ponytail: posting is manual — the user clicks. There is no scheduler, so a
   * rule left alone simply stays due instead of silently backfilling months.
   * Upgrade path: a pg_cron job or Supabase Edge Function calling this same
   * logic server-side; keep the advance idempotent on next_occurrence if so.
   */
  async postOccurrence(rule: RecurringTransaction): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const occurrenceDate = rule.next_occurrence ?? rule.start_date

    // The balance trigger picks this up like any other transaction.
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        date: occurrenceDate,
        amount: rule.amount,
        type: rule.type,
        category_id: rule.category_id,
        account_id: rule.account_id,
        payment_method_id: rule.payment_method_id,
        merchant: rule.merchant,
        notes: rule.notes,
        is_recurring: true,
        recurring_id: rule.id,
      })

    if (txError) throw txError

    const next = toISODate(getNextOccurrence(occurrenceDate, rule.frequency))
    const { error: ruleError } = await supabase
      .from('recurring_transactions')
      .update({
        next_occurrence: next,
        // Past its end date, the rule stops on its own.
        is_active: rule.end_date ? next <= rule.end_date : true,
      })
      .eq('id', rule.id)

    if (ruleError) throw ruleError
  },

  async deleteRecurring(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
