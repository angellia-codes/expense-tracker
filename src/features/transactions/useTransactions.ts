import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService, type CreateTransactionDTO, type UpdateTransactionDTO } from './transactionsService'
import { toast } from 'sonner'

export function useTransactions(limit?: number) {
  return useQuery({
    queryKey: ['transactions', limit],
    queryFn: () => transactionsService.getTransactions(limit),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTransactionDTO) => transactionsService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction added successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add transaction')
    }
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateTransactionDTO }) =>
      transactionsService.updateTransaction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update transaction')
    }
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionsService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete transaction')
    }
  })
}
