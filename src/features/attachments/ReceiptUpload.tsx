import { useRef } from 'react'
import { FileText, Loader2, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { attachmentsService, ACCEPT_ATTR, validateReceipt } from './attachmentsService'
import { useAttachments, useDeleteAttachment, useUploadReceipt } from './useAttachments'

interface ReceiptUploadProps {
  /** Undefined while the transaction is still being created. */
  transactionId?: string
  /** Files picked before the transaction exists; the parent uploads them after insert. */
  pendingFiles: File[]
  onPendingChange: (files: File[]) => void
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ReceiptUpload({ transactionId, pendingFiles, onPendingChange }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: attachments, isLoading } = useAttachments(transactionId)
  const uploadReceipt = useUploadReceipt()
  const deleteAttachment = useDeleteAttachment()

  const onPick = (fileList: FileList | null) => {
    const picked = Array.from(fileList ?? [])
    // Validate before anything else so a bad file never reaches the network,
    // and a bad file in the batch doesn't block the good ones.
    const valid = picked.filter(file => {
      const problem = validateReceipt(file)
      if (problem) toast.error(problem)
      return !problem
    })

    if (transactionId) {
      valid.forEach(file => uploadReceipt.mutate({ transactionId, file }))
    } else if (valid.length) {
      onPendingChange([...pendingFiles, ...valid])
    }

    // Let the same file be picked again after a failure.
    if (inputRef.current) inputRef.current.value = ''
  }

  const openReceipt = async (filePath: string) => {
    try {
      window.open(await attachmentsService.getSignedUrl(filePath), '_blank', 'noopener')
    } catch (error: any) {
      toast.error(error.message || 'Could not open that receipt')
    }
  }

  const rowClass =
    'flex items-center gap-2 rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm'

  return (
    <div className="grid gap-2">
      <Label>Receipts</Label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={e => onPick(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        isLoading={uploadReceipt.isPending}
      >
        <Paperclip className="w-4 h-4 mr-2" />
        Attach receipt
      </Button>

      {isLoading && <p className="text-xs text-text-tertiary">Loading receipts…</p>}

      {/* Already saved */}
      {attachments?.map(attachment => (
        <div key={attachment.id} className={rowClass}>
          <FileText className="w-4 h-4 shrink-0 text-text-tertiary" />
          <button
            type="button"
            onClick={() => openReceipt(attachment.file_path)}
            className="flex-1 truncate text-left text-text-primary hover:text-accent transition-colors"
          >
            {attachment.file_name}
          </button>
          <span className="text-xs text-text-tertiary shrink-0">{formatSize(attachment.file_size)}</span>
          <button
            type="button"
            aria-label={`Remove ${attachment.file_name}`}
            onClick={() => deleteAttachment.mutate(attachment)}
            className="text-text-tertiary hover:text-danger transition-colors shrink-0"
          >
            {deleteAttachment.isPending && deleteAttachment.variables?.id === attachment.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <X className="w-4 h-4" />}
          </button>
        </div>
      ))}

      {/* Staged, uploaded once the transaction exists */}
      {pendingFiles.map((file, index) => (
        <div key={`${file.name}-${index}`} className={`${rowClass} border-dashed`}>
          <FileText className="w-4 h-4 shrink-0 text-text-tertiary" />
          <span className="flex-1 truncate text-text-secondary">{file.name}</span>
          <span className="text-xs text-text-tertiary shrink-0">{formatSize(file.size)}</span>
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() => onPendingChange(pendingFiles.filter((_, i) => i !== index))}
            className="text-text-tertiary hover:text-danger transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {!transactionId && pendingFiles.length > 0 && (
        <p className="text-xs text-text-tertiary">
          Uploaded when you save the transaction.
        </p>
      )}
    </div>
  )
}
