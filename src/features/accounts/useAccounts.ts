import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService, type CreateAccountDTO, type UpdateAccountDTO } from './accountsService'
import { toast } from 'sonner'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountsService.getAccounts,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAccountDTO) => accountsService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Account created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create account')
    }
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: UpdateAccountDTO }) => 
      accountsService.updateAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Account updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update account')
    }
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountsService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Account deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete account')
    }
  })
}
