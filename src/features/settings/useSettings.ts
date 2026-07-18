import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { settingsService, type UpdateProfileDTO } from './settingsService'
import { useAuth } from '@/features/auth/useAuth'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (updates: UpdateProfileDTO) => settingsService.updateProfile(updates),
    onSuccess: async () => {
      // The profile lives in auth context, not the query cache — refresh it so
      // currency, date format and theme take effect without a reload.
      await refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Settings saved')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings')
    },
  })
}

export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const backup = await settingsService.exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = settingsService.backupFilename()
      link.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Backup downloaded'),
    onError: (error: any) => toast.error(error.message || 'Backup failed'),
  })
}

export function useImportTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => settingsService.importTransactionsCsv(text),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (result.imported) toast.success(`Imported ${result.imported} transactions`)
      if (result.errors.length) toast.warning(`${result.errors.length} rows were skipped`)
      if (!result.imported && !result.errors.length) toast.info('Nothing to import')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Import failed')
    },
  })
}
