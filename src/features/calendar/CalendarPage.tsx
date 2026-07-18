import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTransactions } from '@/features/transactions/useTransactions'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { formatCurrency } from '@/utils/currency'
import {
  addMonths,
  format,
  getMonth,
  getYear,
  getDaysInMonth,
  isToday,
  toISODate,
  formatMonthYear,
} from '@/utils/date'
import { getDay } from 'date-fns'
import type { TransactionWithRelations } from '@/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monday-start offset: date-fns getDay() is Sunday-start. */
function leadingBlanks(firstDay: Date): number {
  return (getDay(firstDay) + 6) % 7
}

export function CalendarPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const month = getMonth(viewDate) + 1
  const year = getYear(viewDate)

  // The whole ledger is already cached by the transactions page; filtering a
  // month out of it in memory beats a per-month query.
  const { data: transactions, isLoading } = useTransactions()

  const byDay = useMemo(() => {
    const map = new Map<string, TransactionWithRelations[]>()
    for (const tx of transactions ?? []) {
      const list = map.get(tx.date)
      if (list) list.push(tx)
      else map.set(tx.date, [tx])
    }
    return map
  }, [transactions])

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])
  const selectedTx = selectedDay ? byDay.get(selectedDay) ?? [] : []

  const dayTotals = (key: string) => {
    const txs = byDay.get(key) ?? []
    let income = 0
    let expense = 0
    for (const tx of txs) {
      if (tx.type === 'income') income += Number(tx.amount)
      else if (tx.type === 'expense') expense += Number(tx.amount)
    }
    return { income, expense, count: txs.length }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Calendar</h1>
          <p className="text-text-secondary mt-1">Your month at a glance. Click a day to see what happened.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewDate(d => addMonths(d, -1))} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-44 text-center font-medium text-text-primary">{formatMonthYear(month, year)}</div>
          <Button variant="outline" size="icon" onClick={() => setViewDate(d => addMonths(d, 1))} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton h-[520px] rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-text-tertiary py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: leadingBlanks(days[0]) }, (_, i) => <div key={`blank-${i}`} />)}
              {days.map(day => {
                const key = toISODate(day)
                const { income, expense, count } = dayTotals(key)
                const isSelected = selectedDay === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`min-h-20 sm:min-h-24 rounded-lg border p-1.5 text-left transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent-light'
                        : 'border-border/60 hover:bg-bg-hover'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                      isToday(day) ? 'bg-accent text-white font-semibold' : 'text-text-secondary'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {count > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {income > 0 && (
                          <p className="text-[10px] sm:text-xs font-medium text-success truncate tabular-nums">
                            +{formatCurrency(income, currency, { compact: true })}
                          </p>
                        )}
                        {expense > 0 && (
                          <p className="text-[10px] sm:text-xs font-medium text-danger truncate tabular-nums">
                            -{formatCurrency(expense, currency, { compact: true })}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDay && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-text-primary mb-4">
              {format(new Date(selectedDay), 'EEEE, d MMMM yyyy')}
            </h2>
            {selectedTx.length === 0 ? (
              <p className="text-text-secondary text-sm">Nothing recorded on this day.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {selectedTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{tx.category?.icon || '💸'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {tx.merchant || tx.category?.name || 'Transfer'}
                        </p>
                        <p className="text-xs text-text-secondary">{tx.account?.name}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.type === 'income' ? 'text-success' : tx.type === 'expense' ? 'text-danger' : 'text-text-secondary'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(Number(tx.amount), currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
