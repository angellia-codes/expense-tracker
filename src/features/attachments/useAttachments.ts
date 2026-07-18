import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { attachmentsService } from './attachmentsService'
import type { Attachment } from '@/types'

export function useAttachments(transactionId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', transactionId],
    queryFn: () => attachmentsService.getAttachments(transactionId!),
    enabled: !!transactionId,
  })
}

export function useUploadReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: string; file: File }) =>
      attachmentsService.uploadReceipt(transactionId, file),
    onSuccess: attachment => {
      queryClient.invalidateQueries({ queryKey: ['attachments', attachment.transaction_id] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Receipt uploaded')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload receipt')
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachment: Attachment) => attachmentsService.deleteAttachment(attachment),
    onSuccess: (_, attachment) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', attachment.transaction_id] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Receipt removed')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove receipt')
    },
  })
}
