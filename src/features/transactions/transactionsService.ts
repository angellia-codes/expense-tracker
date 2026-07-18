import { supabase } from '@/lib/supabase'
import { attachmentsService } from '@/features/attachments/attachmentsService'
import type { Transaction, TransactionInsert, TransactionWithRelations } from '@/types'

export type CreateTransactionDTO = Omit<TransactionInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateTransactionDTO = Partial<CreateTransactionDTO>

export const transactionsService = {
  async getTransactions(limit?: number): Promise<TransactionWithRelations[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts!transactions_account_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data as TransactionWithRelations[]
  },

  async createTransaction(transaction: CreateTransactionDTO): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data as Transaction
  },

  async updateTransaction(id: string, updates: UpdateTransactionDTO): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Transaction
  },

  async deleteTransaction(id: string): Promise<void> {
    // Storage first: the attachments rows vanish with the transaction via
    // ON DELETE CASCADE, and once they're gone nothing knows the file paths.
    await attachmentsService.removeFilesForTransaction(id)

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
