import { useCallback, useMemo, useState } from 'react'
import { useBudgets } from '@/features/budgets/useBudgets'
import { useRecurring } from '@/features/recurring/useRecurring'
import { useSavingsGoals } from '@/features/savings/useSavings'
import { useAuth } from '@/features/auth/useAuth'
import { formatCurrency } from '@/utils/currency'
import { getCurrentMonthYear, daysBetween, toISODate, formatRelativeDate } from '@/utils/date'
import type { NotificationType } from '@/types'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  icon: string
  /** Route to open when the notification is clicked. */
  href: string
}

// ponytail: notifications are derived from live data on read, not rows in the
// `notifications` table. No writes means no duplicate-suppression logic and no
// scheduler. Move to table-backed rows (with a DB trigger) if they ever need to
// survive across devices or fire while the app is closed.
const DISMISSED_KEY = 'dismissed-notifications'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function useNotifications() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'
  const { month, year } = getCurrentMonthYear()

  const { data: budgets } = useBudgets(month, year)
  const { data: recurring } = useRecurring()
  const { data: goals } = useSavingsGoals()

  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = prev.includes(id) ? prev : [...prev, id]
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const dismissAll = useCallback((ids: string[]) => {
    setDismissed(prev => {
      const next = [...new Set([...prev, ...ids])]
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const notifications = useMemo(() => {
    const list: AppNotification[] = []

    for (const budget of budgets ?? []) {
      if (budget.remaining >= 0) continue
      list.push({
        id: `budget-${budget.id}-${month}-${year}`,
        type: 'budget_exceeded',
        title: `${budget.category?.name ?? 'A budget'} is over`,
        message: `${formatCurrency(Math.abs(budget.remaining), currency)} past the ${formatCurrency(Number(budget.amount), currency)} cap.`,
        icon: '🚨',
        href: '/budgets',
      })
    }

    // Bills landing within the week, plus anything already past due.
    const today = toISODate(new Date())
    for (const rule of recurring ?? []) {
      if (!rule.is_active || !rule.next_occurrence) continue
      const days = daysBetween(today, rule.next_occurrence)
      if (days > 7) continue
      list.push({
        id: `bill-${rule.id}-${rule.next_occurrence}`,
        type: days < 0 ? 'recurring_payment' : 'upcoming_bill',
        title: `${rule.merchant || rule.category?.name || 'Recurring'} ${days < 0 ? 'overdue' : 'due'} ${formatRelativeDate(rule.next_occurrence)}`,
        message: `${formatCurrency(Number(rule.amount), currency)} from ${rule.account?.name ?? 'your account'}.`,
        icon: days < 0 ? '⏰' : '📅',
        href: '/recurring',
      })
    }

    for (const goal of goals ?? []) {
      const target = Number(goal.target_amount)
      if (target <= 0) continue
      const pct = (Number(goal.current_amount) / target) * 100
      // Announce the highest quarter crossed, not every one of them.
      const milestone = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0
      if (!milestone) continue
      list.push({
        id: `goal-${goal.id}-${milestone}`,
        type: 'savings_milestone',
        title: milestone === 100 ? `🎉 "${goal.name}" reached!` : `"${goal.name}" is ${milestone}% funded`,
        message: `${formatCurrency(Number(goal.current_amount), currency)} of ${formatCurrency(target, currency)} saved.`,
        icon: milestone === 100 ? '🏆' : '🎯',
        href: '/savings',
      })
    }

    return list.filter(n => !dismissed.includes(n.id))
  }, [budgets, recurring, goals, currency, month, year, dismissed])

  return { notifications, dismiss, dismissAll, unreadCount: notifications.length }
}
