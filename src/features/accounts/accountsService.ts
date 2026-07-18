import { supabase } from '@/lib/supabase'
import type { Account, AccountInsert } from '@/types'

// Derived from the Insert type, not the Row type: DB-defaulted columns
// (icon, is_active, sort_order, ...) must stay optional for callers.
// id/timestamps are dropped so the same shape works for updates too.
export type CreateAccountDTO = Omit<AccountInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateAccountDTO = Partial<CreateAccountDTO>

export const accountsService = {
  async getAccounts(): Promise<Account[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return data as Account[]
  },

  async createAccount(account: CreateAccountDTO): Promise<Account> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...account,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data as Account
  },

  async updateAccount(id: string, updates: UpdateAccountDTO): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Account
  },

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
