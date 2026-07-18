import { useQuery } from '@tanstack/react-query'
import { dashboardService } from './dashboardService'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardService.getSummary,
  })
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: ['dashboard', 'recent-transactions'],
    queryFn: dashboardService.getRecentTransactions,
  })
}
