import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recurringService, type CreateRecurringDTO, type UpdateRecurringDTO } from './recurringService'
import { toast } from 'sonner'
import type { RecurringTransaction } from '@/types'

export function useRecurring() {
  return useQuery({
    queryKey: ['recurring'],
    queryFn: recurringService.getRecurring,
  })
}

export function useCreateRecurring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRecurringDTO) => recurringService.createRecurring(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Recurring rule created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create recurring rule')
    }
  })
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateRecurringDTO }) =>
      recurringService.updateRecurring(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Recurring rule updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update recurring rule')
    }
  })
}

export function usePostOccurrence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rule: RecurringTransaction) => recurringService.postOccurrence(rule),
    onSuccess: () => {
      // Posting writes to the ledger, so balances and the dashboard move too.
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Transaction posted')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to post transaction')
    }
  })
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => recurringService.deleteRecurring(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      toast.success('Recurring rule deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete recurring rule')
    }
  })
}
