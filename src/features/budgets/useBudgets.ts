import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsService, type CreateBudgetDTO, type UpdateBudgetDTO } from './budgetsService'
import { toast } from 'sonner'

export function useBudgets(month: number, year: number) {
  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => budgetsService.getBudgets(month, year),
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBudgetDTO) => budgetsService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Budget created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create budget')
    }
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateBudgetDTO }) =>
      budgetsService.updateBudget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Budget updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update budget')
    }
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => budgetsService.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Budget deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete budget')
    }
  })
}
