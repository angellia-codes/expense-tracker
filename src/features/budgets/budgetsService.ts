import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, toISODate } from '@/utils/date'
import type { Budget, BudgetInsert, BudgetWithSpending, Category } from '@/types'

export type CreateBudgetDTO = Omit<BudgetInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateBudgetDTO = Partial<CreateBudgetDTO>

export const budgetsService = {
  /**
   * Budgets for a month, each joined with its category and the amount actually
   * spent. Spending is derived from the ledger on read — nothing is stored.
   */
  async getBudgets(month: number, year: number): Promise<BudgetWithSpending[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)

    if (error) throw error
    if (!budgets?.length) return []

    // One query for the whole month, grouped in memory — cheaper than a
    // per-budget aggregate and the month's expense rows are small.
    const monthStart = startOfMonth(new Date(year, month - 1, 1))
    const { data: expenses, error: expensesError } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', toISODate(monthStart))
      .lte('date', toISODate(endOfMonth(monthStart)))

    if (expensesError) throw expensesError

    const spentByCategory = new Map<string, number>()
    for (const tx of expenses ?? []) {
      if (!tx.category_id) continue
      spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + Number(tx.amount))
    }

    return budgets.map((budget) => {
      const amount = Number(budget.amount)
      const spent = spentByCategory.get(budget.category_id) ?? 0
      return {
        ...(budget as Budget),
        category: budget.category as Category,
        spent,
        remaining: amount - spent,
        // Uncapped on purpose: the UI needs to know how far over you went.
        percentage: amount > 0 ? (spent / amount) * 100 : 0,
      }
    })
  },

  async createBudget(budget: CreateBudgetDTO): Promise<Budget> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, user_id: user.id })
      .select()
      .single()

    // UNIQUE (user_id, category_id, month, year) — surface it as something readable
    if (error?.code === '23505') throw new Error('A budget already exists for this category this month')
    if (error) throw error
    return data as Budget
  },

  async updateBudget(id: string, updates: UpdateBudgetDTO): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error?.code === '23505') throw new Error('A budget already exists for this category this month')
    if (error) throw error
    return data as Budget
  },

  async deleteBudget(id: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
