import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useReport } from './useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/features/auth/useAuth'
import { formatCurrency, formatCompactNumber } from '@/utils/currency'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  toISODate,
  parseISO,
  formatTransactionDate,
} from '@/utils/date'

type PresetKey = 'this-month' | 'last-month' | 'last-3' | 'last-6' | 'this-year' | 'custom'

const PRESETS: { key: PresetKey; label: string; range?: () => { start: Date; end: Date } }[] = [
  { key: 'this-month', label: 'This month', range: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { key: 'last-month', label: 'Last month', range: () => {
    const prev = subMonths(new Date(), 1)
    return { start: startOfMonth(prev), end: endOfMonth(prev) }
  } },
  { key: 'last-3', label: 'Last 3 months', range: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) }) },
  { key: 'last-6', label: 'Last 6 months', range: () => ({ start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) }) },
  { key: 'this-year', label: 'This year', range: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: endOfMonth(new Date()) }) },
  { key: 'custom', label: 'Custom' },
]

/** Fallback wheel for categories saved without a colour. */
const FALLBACK_COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899']

const INSIGHT_STYLES: Record<string, string> = {
  increase: 'border-danger/40 bg-danger-light',
  decrease: 'border-success/40 bg-success-light',
  warning: 'border-warning/40 bg-warning-light',
  tip: 'border-accent/40 bg-accent-light',
  milestone: 'border-info/40 bg-info-light',
}

export function ReportsPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  const [preset, setPreset] = useState<PresetKey>('this-month')
  const [customStart, setCustomStart] = useState(() => toISODate(startOfMonth(subMonths(new Date(), 2))))
  const [customEnd, setCustomEnd] = useState(() => toISODate(new Date()))

  const { start, end } = useMemo(() => {
    const found = PRESETS.find(p => p.key === preset)
    if (found?.range) return found.range()
    const s = parseISO(customStart)
    const e = parseISO(customEnd)
    // Swapped inputs would produce an empty interval and crash the day bucketing.
    return e < s ? { start: e, end: s } : { start: s, end: e }
  }, [preset, customStart, customEnd])

  const { data, isLoading } = useReport(start, end, currency)

  const money = (v: number) => formatCurrency(v, currency)
  const axisMoney = (v: number) => formatCompactNumber(v)
  // Recharts hands the formatter a loose ValueType; coerce at the boundary.
  const moneyTooltip = (v: unknown) => money(Number(v))

  const tooltipStyle = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    color: 'var(--color-text-primary)',
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Reports</h1>
        <p className="text-text-secondary mt-1">Where the money went, and how that compares to before.</p>
      </div>

      {/* Range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? 'default' : 'outline'}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              aria-label="Start date"
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary"
            />
            <span className="text-text-tertiary text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              aria-label="End date"
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 skeleton h-80 rounded-xl" />
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </div>
      ) : !data || data.transactionCount === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No transactions in this range</h3>
          <p className="text-text-secondary mt-1">Pick a different period or add some transactions.</p>
        </div>
      ) : (
        <>
          {/* Headline metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Income" amount={data.totalIncome} delay={0.05} />
            <StatCard title="Expenses" amount={data.totalExpense} delay={0.1} />
            <StatCard title="Net Savings" amount={data.netSavings} delay={0.15} />
            <StatCard title="Avg Daily Spend" amount={data.avgDailyExpense} delay={0.2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs expense over time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series}>
                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-bg-hover)' }} formatter={moneyTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Spending by category */}
            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {data.byCategory.map((slice, i) => (
                        <Cell key={slice.id} fill={slice.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cumulative net */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Cumulative Net</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series}>
                    <defs>
                      <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
                    <Tooltip contentStyle={tooltipStyle} formatter={moneyTooltip} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="Net"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#netFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-3">Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.insights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex gap-3 rounded-xl border p-4 ${INSIGHT_STYLES[insight.type] ?? 'border-border'}`}
                  >
                    <span className="text-xl leading-none">{insight.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">{insight.title}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{insight.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Spending Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.byCategory.slice(0, 6).map((cat, i) => {
                  const share = data.totalExpense > 0 ? (cat.value / data.totalExpense) * 100 : 0
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-text-primary min-w-0">
                          <span>{cat.icon}</span>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="text-text-secondary shrink-0 tabular-nums">
                          {money(cat.value)} · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${share}%`,
                            backgroundColor: cat.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Largest expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Largest Expenses</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/50">
                {data.topExpenses.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {tx.merchant || tx.category?.name || 'Expense'}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatTransactionDate(tx.date)} · {tx.category?.name ?? 'Uncategorized'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
                      {money(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Savings rate footer */}
          <Card>
            <CardContent className="p-6 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                {data.savingsRate >= 0
                  ? <TrendingUp className="w-8 h-8 text-success" />
                  : <TrendingDown className="w-8 h-8 text-danger" />}
                <div>
                  <p className="text-sm text-text-secondary">Savings rate</p>
                  <p className="text-2xl font-semibold text-text-primary tabular-nums">
                    {data.savingsRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Transactions</p>
                <p className="text-2xl font-semibold text-text-primary tabular-nums">{data.transactionCount}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
