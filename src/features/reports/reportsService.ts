import { supabase } from '@/lib/supabase'
import { toISODate, format, subDays } from '@/utils/date'
import { differenceInDays, eachDayOfInterval, eachMonthOfInterval } from 'date-fns'
import { formatCurrency } from '@/utils/currency'
import type { Insight, TransactionWithRelations } from '@/types'

export interface CategorySlice {
  id: string
  name: string
  icon: string
  color: string
  value: number
}

export interface SeriesPoint {
  label: string
  income: number
  expense: number
  /** Running income - expense across the range. */
  cumulative: number
}

export interface ReportData {
  totalIncome: number
  totalExpense: number
  netSavings: number
  /** Share of income kept, 0 when there was no income. */
  savingsRate: number
  avgDailyExpense: number
  transactionCount: number
  byCategory: CategorySlice[]
  series: SeriesPoint[]
  topExpenses: TransactionWithRelations[]
  insights: Insight[]
}

const UNCATEGORIZED = { id: 'none', name: 'Uncategorized', icon: '📁', color: '#5a5a78' }

function sum(txs: TransactionWithRelations[], type: 'income' | 'expense'): number {
  return txs.reduce((acc, t) => (t.type === type ? acc + Number(t.amount) : acc), 0)
}

/** Expense totals per category, biggest first. */
function groupByCategory(txs: TransactionWithRelations[]): CategorySlice[] {
  const map = new Map<string, CategorySlice>()
  for (const tx of txs) {
    if (tx.type !== 'expense') continue
    const cat = tx.category ?? UNCATEGORIZED
    const slice = map.get(cat.id) ?? {
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '📁',
      color: cat.color || UNCATEGORIZED.color,
      value: 0,
    }
    slice.value += Number(tx.amount)
    map.set(cat.id, slice)
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
}

/**
 * Bucket by day for short ranges, by month beyond ~2 months — otherwise a
 * year-long range renders 365 x-axis ticks.
 */
function buildSeries(txs: TransactionWithRelations[], start: Date, end: Date): SeriesPoint[] {
  const daily = differenceInDays(end, start) <= 62
  const buckets = daily
    ? eachDayOfInterval({ start, end }).map(d => ({ key: toISODate(d), label: format(d, 'd MMM') }))
    : eachMonthOfInterval({ start, end }).map(d => ({ key: toISODate(d).slice(0, 7), label: format(d, 'MMM yy') }))

  const keyOf = (date: string) => (daily ? date : date.slice(0, 7))
  const totals = new Map(buckets.map(b => [b.key, { income: 0, expense: 0 }]))
  for (const tx of txs) {
    const bucket = totals.get(keyOf(tx.date))
    if (!bucket) continue
    if (tx.type === 'income') bucket.income += Number(tx.amount)
    else if (tx.type === 'expense') bucket.expense += Number(tx.amount)
  }

  let running = 0
  return buckets.map(b => {
    const t = totals.get(b.key)!
    running += t.income - t.expense
    return { label: b.label, income: t.income, expense: t.expense, cumulative: running }
  })
}

/**
 * Rule-based insights. Every rule compares the range against the immediately
 * preceding range of the same length, so "last month" is a fair baseline.
 */
function buildInsights(
  current: TransactionWithRelations[],
  previous: TransactionWithRelations[],
  currency: string,
  days: number
): Insight[] {
  const insights: Insight[] = []
  const curByCat = groupByCategory(current)
  const prevByCat = new Map(groupByCategory(previous).map(c => [c.id, c.value]))

  // Category swings of 20%+ against a non-trivial baseline.
  for (const cat of curByCat.slice(0, 6)) {
    const before = prevByCat.get(cat.id) ?? 0
    if (before <= 0) continue
    const change = ((cat.value - before) / before) * 100
    if (Math.abs(change) < 20) continue
    insights.push({
      id: `cat-${cat.id}`,
      type: change > 0 ? 'increase' : 'decrease',
      title: `${cat.name} ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(0)}%`,
      description: `${formatCurrency(cat.value, currency)} this period versus ${formatCurrency(before, currency)} before.`,
      change,
      category: cat.name,
      icon: cat.icon,
    })
  }

  // Spending more than you earned.
  const income = sum(current, 'income')
  const expense = sum(current, 'expense')
  if (expense > income && expense > 0) {
    insights.push({
      id: 'overspend',
      type: 'warning',
      title: 'You spent more than you earned',
      description: `${formatCurrency(expense - income, currency)} more went out than came in over this period.`,
      value: expense - income,
      icon: '⚠️',
    })
  }

  // Single transactions far above their category's own average.
  const catAverages = new Map<string, { total: number; count: number }>()
  for (const tx of current) {
    if (tx.type !== 'expense') continue
    const id = tx.category?.id ?? UNCATEGORIZED.id
    const agg = catAverages.get(id) ?? { total: 0, count: 0 }
    agg.total += Number(tx.amount)
    agg.count += 1
    catAverages.set(id, agg)
  }
  for (const tx of current) {
    if (tx.type !== 'expense') continue
    const agg = catAverages.get(tx.category?.id ?? UNCATEGORIZED.id)!
    if (agg.count < 3) continue
    const avg = agg.total / agg.count
    if (Number(tx.amount) < avg * 2) continue
    insights.push({
      id: `unusual-${tx.id}`,
      type: 'warning',
      title: `Unusual ${tx.category?.name ?? 'expense'} charge`,
      description: `${tx.merchant || 'A transaction'} at ${formatCurrency(Number(tx.amount), currency)} is over twice the ${formatCurrency(avg, currency)} average for this category.`,
      value: Number(tx.amount),
      icon: '🔍',
    })
  }

  // What trimming the top category would be worth over a year.
  const top = curByCat[0]
  if (top && days > 0 && top.value > 0) {
    const annual = (top.value / days) * 365 * 0.1
    insights.push({
      id: 'tip-top-category',
      type: 'tip',
      title: `${top.name} is your biggest expense`,
      description: `Cutting it by 10% would save about ${formatCurrency(annual, currency)} a year.`,
      value: annual,
      category: top.name,
      icon: '💡',
    })
  }

  // Keep the noisiest rule (unusual charges) from burying everything else.
  return insights.slice(0, 8)
}

export const reportsService = {
  /**
   * Everything the reports page needs, from a single query covering the range
   * plus the preceding range of equal length (the comparison baseline).
   */
  async getReport(start: Date, end: Date, currency = 'IDR'): Promise<ReportData> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const days = differenceInDays(end, start) + 1
    const prevStart = subDays(start, days)

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts!transactions_account_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .gte('date', toISODate(prevStart))
      .lte('date', toISODate(end))
      .order('date', { ascending: true })

    if (error) throw error

    // date is a DATE column, so lexical comparison on 'yyyy-MM-dd' is chronological.
    const startKey = toISODate(start)
    const all = (data ?? []) as TransactionWithRelations[]
    const current = all.filter(t => t.date >= startKey)
    const previous = all.filter(t => t.date < startKey)

    const totalIncome = sum(current, 'income')
    const totalExpense = sum(current, 'expense')

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      avgDailyExpense: totalExpense / Math.max(days, 1),
      transactionCount: current.length,
      byCategory: groupByCategory(current),
      series: buildSeries(current, start, end),
      topExpenses: current
        .filter(t => t.type === 'expense')
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5),
      insights: buildInsights(current, previous, currency, days),
    }
  },
}
