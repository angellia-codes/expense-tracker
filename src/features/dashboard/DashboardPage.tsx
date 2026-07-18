import { useDashboardSummary, useRecentTransactions } from './useDashboard'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatTransactionDate, startOfMonth, endOfMonth } from '@/utils/date'
import { getCurrencySymbol, formatCurrency, formatCompactNumber } from '@/utils/currency'
import { useAuth } from '@/features/auth/useAuth'
import { useReport } from '@/features/reports/useReports'
import { motion } from 'framer-motion'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft,
} from 'lucide-react'

export function DashboardPage() {
  const { profile } = useAuth()
  const { data: summary, isLoading: isLoadingSummary } = useDashboardSummary()
  const { data: transactions, isLoading: isLoadingTx } = useRecentTransactions()

  const currency = profile?.default_currency || 'IDR'

  const monthRange = useMemo(() => {
    const now = new Date()
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [])
  const { data: report, isLoading: isLoadingReport } = useReport(monthRange.start, monthRange.end, currency)

  if (isLoadingSummary || isLoadingTx) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="skeleton h-8 w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-xl"></div>
          <div className="skeleton h-96 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Here's your financial overview for this month.</p>
        </div>
        
        {/* Quick action buttons could go here */}
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Balance" 
          amount={summary?.totalBalance || 0} 
          delay={0.1}
        />
        <StatCard 
          title="Monthly Income" 
          amount={summary?.monthlyIncome || 0} 
          change={summary?.incomeChange}
          trend={summary && summary.incomeChange > 0 ? 'up' : 'down'}
          delay={0.2}
        />
        <StatCard 
          title="Monthly Expenses" 
          amount={summary?.monthlyExpenses || 0} 
          change={summary?.expenseChange}
          trend={summary && summary.expenseChange > 0 ? 'down' : 'up'} // Down is good for expenses
          delay={0.3}
        />
        <StatCard 
          title="Net Savings" 
          amount={summary?.monthlySavings || 0} 
          delay={0.4}
        />
      </div>

      {/* Charts & Lists Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash flow for the current month — same series the Reports page builds */}
        <Card className="lg:col-span-2 flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 border-t border-border/50 pt-4">
            {isLoadingReport ? (
              <div className="skeleton h-full rounded-lg" />
            ) : !report?.transactionCount ? (
              <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
                No transactions this month yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.series}>
                  <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={formatCompactNumber} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      color: 'var(--color-text-primary)',
                    }}
                    cursor={{ fill: 'var(--color-bg-hover)' }}
                    formatter={(v: unknown) => formatCurrency(Number(v), currency)}
                  />
                  <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions List */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Transactions</CardTitle>
            <button className="text-sm text-accent hover:underline">View all</button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-0">
            {(!transactions || transactions.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary p-6 text-center">
                <ArrowRightLeft className="w-12 h-12 mb-3 opacity-20" />
                <p>No recent transactions</p>
                <p className="text-xs mt-1">Your ledger is empty.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {transactions.map((tx, i) => (
                  <motion.div 
                    key={tx.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="flex items-center justify-between p-4 hover:bg-bg-hover transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'income' ? 'bg-success-light text-success' :
                        tx.type === 'expense' ? 'bg-danger-light text-danger' :
                        'bg-info-light text-info'
                      }`}>
                        {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> :
                         tx.type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> :
                         <ArrowRightLeft className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {tx.merchant || tx.category?.name || 'Transfer'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                          <span>{formatTransactionDate(tx.date)}</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span className="truncate">{tx.account?.name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                      tx.type === 'income' ? 'text-success' :
                      tx.type === 'expense' ? 'text-text-primary' :
                      'text-text-secondary'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {getCurrencySymbol(currency)}{Number(tx.amount).toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
