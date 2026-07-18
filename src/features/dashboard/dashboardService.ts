import { supabase } from '@/lib/supabase'
import type { DashboardSummary, TransactionWithRelations } from '@/types'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { budgetsService } from '@/features/budgets/budgetsService'

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const now = new Date()
    const currentMonthStart = startOfMonth(now).toISOString()
    const currentMonthEnd = endOfMonth(now).toISOString()
    
    const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
    const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get total balance from all active accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', user.id)
      .eq('is_active', true)
      
    if (accountsError) throw accountsError
    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

    // Get current month transactions
    const { data: currentTx, error: currentTxError } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id)
      .gte('date', currentMonthStart)
      .lte('date', currentMonthEnd)

    if (currentTxError) throw currentTxError

    // Get previous month transactions
    const { data: prevTx, error: prevTxError } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id)
      .gte('date', prevMonthStart)
      .lte('date', prevMonthEnd)

    if (prevTxError) throw prevTxError

    // Calculate current month
    const monthlyIncome = currentTx
      ?.filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      
    const monthlyExpenses = currentTx
      ?.filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

    // Calculate previous month
    const prevIncome = prevTx
      ?.filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      
    const prevExpenses = prevTx
      ?.filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

    // Calculate changes
    const incomeChange = prevIncome === 0 ? 0 : ((monthlyIncome - prevIncome) / prevIncome) * 100
    const expenseChange = prevExpenses === 0 ? 0 : ((monthlyExpenses - prevExpenses) / prevExpenses) * 100

    // Budgeted total for this month, less what has been spent against those
    // categories. Goes negative when the user is over budget.
    const budgets = await budgetsService.getBudgets(now.getMonth() + 1, now.getFullYear())
    const budgetRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0)

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
      budgetRemaining,
      netWorth: totalBalance, // Placeholder for actual net worth calculation
      incomeChange,
      expenseChange
    }
  },

  async getRecentTransactions(): Promise<TransactionWithRelations[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts!transactions_account_id_fkey(*)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data as TransactionWithRelations[]
  }
}
