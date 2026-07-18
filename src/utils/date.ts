/**
 * Date formatting utilities using date-fns
 */
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isSameMonth,
  isSameYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subDays,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  getMonth,
  getYear,
  isValid,
} from 'date-fns'
import type { DateFormat, Frequency } from '@/types'

const DATE_FORMAT_MAP: Record<DateFormat, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
}

/**
 * Format a date string or Date object
 */
export function formatDate(
  date: string | Date,
  dateFormat: DateFormat = 'DD/MM/YYYY'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid date'
  return format(d, DATE_FORMAT_MAP[dateFormat])
}

/**
 * Format date as relative (Today, Yesterday, or full date)
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return 'Invalid date'
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format date for display in transaction lists
 */
export function formatTransactionDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isSameYear(d, new Date())) return format(d, 'dd MMM')
  return format(d, 'dd MMM yyyy')
}

/**
 * Format month and year
 */
export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return format(date, 'MMMM yyyy')
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: getMonth(now) + 1, year: getYear(now) }
}

/**
 * Get date range for current month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

/**
 * Get date range for previous month
 */
export function getPreviousMonthRange(): { start: Date; end: Date } {
  const prev = subMonths(new Date(), 1)
  return { start: startOfMonth(prev), end: endOfMonth(prev) }
}

/**
 * Get date range for current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
}

/**
 * Calculate next occurrence based on frequency
 */
export function getNextOccurrence(
  currentDate: string | Date,
  frequency: Frequency
): Date {
  const d = typeof currentDate === 'string' ? parseISO(currentDate) : currentDate
  switch (frequency) {
    case 'weekly': return addWeeks(d, 1)
    case 'monthly': return addMonths(d, 1)
    case 'quarterly': return addMonths(d, 3)
    case 'yearly': return addYears(d, 1)
    default: return addMonths(d, 1)
  }
}

/**
 * Get days array for a month (for calendar view)
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(start)
  return eachDayOfInterval({ start, end })
}

/**
 * Get months array for a year range
 */
export function getMonthsInRange(startDate: Date, endDate: Date): Date[] {
  return eachMonthOfInterval({ start: startDate, end: endDate })
}

/**
 * Calculate estimated completion date for savings goal
 */
export function estimateCompletionDate(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number
): Date | null {
  if (monthlyContribution <= 0 || currentAmount >= targetAmount) return null
  const remaining = targetAmount - currentAmount
  const monthsNeeded = Math.ceil(remaining / monthlyContribution)
  return addMonths(new Date(), monthsNeeded)
}

/**
 * Format a date for Supabase queries (ISO format)
 */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const s = typeof start === 'string' ? parseISO(start) : start
  const e = typeof end === 'string' ? parseISO(end) : end
  return differenceInDays(e, s)
}

// Re-export commonly used date-fns functions
export {
  format,
  parseISO,
  isToday,
  isYesterday,
  isSameMonth,
  isSameYear,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  addDays,
  addMonths,
  getMonth,
  getYear,
  isValid,
  differenceInMonths,
}
