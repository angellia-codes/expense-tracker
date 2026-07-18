import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savingsService, type CreateSavingsGoalDTO, type UpdateSavingsGoalDTO } from './savingsService'
import { toast } from 'sonner'
import type { SavingsGoal } from '@/types'

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings'],
    queryFn: savingsService.getGoals,
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSavingsGoalDTO) => savingsService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Savings goal created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create savings goal')
    }
  })
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateSavingsGoalDTO }) =>
      savingsService.updateGoal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Savings goal updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update savings goal')
    }
  })
}

export function useContribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ goal, amount }: { goal: SavingsGoal, amount: number }) =>
      savingsService.contribute(goal, amount),
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success(goal.is_completed ? `🎉 "${goal.name}" reached!` : 'Contribution saved')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save contribution')
    }
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => savingsService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      toast.success('Savings goal deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete savings goal')
    }
  })
}
