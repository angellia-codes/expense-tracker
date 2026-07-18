import { useQuery } from '@tanstack/react-query'
import { reportsService } from './reportsService'
import { toISODate } from '@/utils/date'

export function useReport(start: Date, end: Date, currency: string) {
  return useQuery({
    // Nested under 'dashboard' on purpose: every mutation in the app already
    // invalidates ['dashboard'], so reports stay fresh without touching them.
    // Dates are keyed by their ISO day so a re-render with a fresh Date object
    // for the same day doesn't refetch.
    queryKey: ['dashboard', 'report', toISODate(start), toISODate(end), currency],
    queryFn: () => reportsService.getReport(start, end, currency),
  })
}
