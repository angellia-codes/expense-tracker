import { supabase } from '@/lib/supabase'
import type { Attachment } from '@/types'

const BUCKET = 'receipts'

/** Kept in step with the bucket's allowed_mime_types in schema.sql. */
export const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
] as const

export const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Value for an <input type="file"> accept attribute. */
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

/**
 * Client-side gate. The bucket enforces the same two rules server-side, so this
 * is only here to fail fast with a message worth reading — never rely on it.
 * Returns an error string, or null when the file is fine.
 */
export function validateReceipt(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only JPEG, PNG, WebP, HEIC and PDF files are accepted`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 5 MB limit`
  }
  return null
}

/** Strip anything that would make a messy or ambiguous storage key. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
}

export const attachmentsService = {
  async getAttachments(transactionId: string): Promise<Attachment[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Attachment[]
  },

  /**
   * Upload one receipt and record it. The storage path must start with the
   * user's id — the bucket policies match on that first segment.
   */
  async uploadReceipt(transactionId: string, file: File): Promise<Attachment> {
    const invalid = validateReceipt(file)
    if (invalid) throw new Error(invalid)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const path = `${user.id}/${transactionId}/${crypto.randomUUID()}-${safeName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type })

    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('attachments')
      .insert({
        transaction_id: transactionId,
        user_id: user.id,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    // Don't leave a file behind that no row points at.
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      throw error
    }

    return data as Attachment
  },

  /** Remove the row and the file. Row first — an orphaned file is the cheaper leak. */
  async deleteAttachment(attachment: Pick<Attachment, 'id' | 'file_path'>): Promise<void> {
    const { error } = await supabase.from('attachments').delete().eq('id', attachment.id)
    if (error) throw error

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.file_path])
    if (storageError) throw storageError
  },

  /**
   * Delete every stored file for a transaction. The `attachments` rows go on
   * their own via ON DELETE CASCADE, but storage has no idea the parent left.
   */
  async removeFilesForTransaction(transactionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('attachments')
      .select('file_path')
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)

    const paths = (data ?? []).map(a => a.file_path)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
  },

  /** Short-lived URL for viewing. The bucket is private, so there is no public link. */
  async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60)

    if (error) throw error
    return data.signedUrl
  },
}
