import { supabase } from '@/lib/supabase'
import { parseCsv } from '@/utils/csv'
import { toISODate } from '@/utils/date'
import type { Profile, ProfileUpdate, TransactionInsert } from '@/types'

export type UpdateProfileDTO = Omit<ProfileUpdate, 'id' | 'created_at' | 'updated_at'>

export interface ImportResult {
  imported: number
  /** Row-level problems, 1-indexed against the file including its header. */
  errors: string[]
}

/** Columns the importer understands — the same header our exporter writes. */
const REQUIRED_COLUMNS = ['date', 'type', 'amount', 'account'] as const

export const settingsService = {
  async updateProfile(updates: UpdateProfileDTO): Promise<Profile> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data as Profile
  },

  /** Everything the user owns, as one JSON object. Restore is manual for now. */
  async exportBackup(): Promise<Record<string, unknown>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const tables = [
      'profiles', 'accounts', 'categories', 'transactions',
      'budgets', 'savings_goals', 'recurring_transactions', 'payment_methods', 'tags',
    ] as const

    const backup: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
    }

    // Untyped client on purpose: calling .from() with a variable makes
    // supabase-js union every table's Row type, which blows tsc's heap. The
    // result is JSON-dumped verbatim, so there is nothing to type here.
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => Promise<{ data: unknown; error: { message: string } | null }>
        }
      }
    }

    for (const table of tables) {
      // profiles keys on `id`, everything else on `user_id`.
      const column = table === 'profiles' ? 'id' : 'user_id'
      const { data, error } = await client.from(table).select('*').eq(column, user.id)
      if (error) throw error
      backup[table] = data
    }

    return backup
  },

  /**
   * Import transactions from CSV using our own export format:
   * Date, Type, Merchant, Category, Account, Amount, Notes.
   *
   * Accounts and categories are matched by name against what already exists —
   * nothing is auto-created, so a typo surfaces as a row error instead of
   * silently spawning a duplicate account.
   */
  async importTransactionsCsv(text: string): Promise<ImportResult> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const rows = parseCsv(text).filter(row => row.some(cell => cell.trim() !== ''))
    if (rows.length < 2) throw new Error('That file has no data rows')

    const header = rows[0].map(h => h.trim().toLowerCase())
    const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c))
    if (missing.length) throw new Error(`Missing required column(s): ${missing.join(', ')}`)

    const col = (name: string) => header.indexOf(name)
    const [dateCol, typeCol, amountCol, accountCol] = REQUIRED_COLUMNS.map(col)
    const merchantCol = col('merchant')
    const categoryCol = col('category')
    const notesCol = col('notes')

    const [{ data: accounts }, { data: categories }] = await Promise.all([
      supabase.from('accounts').select('id, name').eq('user_id', user.id),
      supabase.from('categories').select('id, name').eq('user_id', user.id),
    ])

    const accountByName = new Map((accounts ?? []).map(a => [a.name.toLowerCase(), a]))
    const categoryByName = new Map((categories ?? []).map(c => [c.name.toLowerCase(), c.id]))

    const errors: string[] = []
    const inserts: TransactionInsert[] = []

    rows.slice(1).forEach((row, index) => {
      const lineNumber = index + 2
      const cell = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')

      const date = cell(dateCol)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
        errors.push(`Row ${lineNumber}: date "${date}" is not a valid YYYY-MM-DD date`)
        return
      }

      const type = cell(typeCol).toLowerCase()
      if (type !== 'income' && type !== 'expense' && type !== 'transfer') {
        errors.push(`Row ${lineNumber}: type "${type}" must be income, expense or transfer`)
        return
      }

      // Our exporter writes expenses negative; accept either sign and normalise.
      const amount = Math.abs(Number(cell(amountCol).replace(/[^0-9.\-]/g, '')))
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Row ${lineNumber}: amount "${cell(amountCol)}" is not a positive number`)
        return
      }

      const account = accountByName.get(cell(accountCol).toLowerCase())
      if (!account) {
        errors.push(`Row ${lineNumber}: no account named "${cell(accountCol)}"`)
        return
      }

      const categoryName = cell(categoryCol)
      const categoryId = categoryName ? categoryByName.get(categoryName.toLowerCase()) ?? null : null
      if (categoryName && !categoryId) {
        errors.push(`Row ${lineNumber}: no category named "${categoryName}"`)
        return
      }

      inserts.push({
        user_id: user.id,
        date,
        type,
        amount,
        account_id: account.id,
        category_id: categoryId,
        merchant: cell(merchantCol) || null,
        notes: cell(notesCol) || null,
      })
    })

    if (!inserts.length) return { imported: 0, errors }

    // Balances need no work here: trg_transactions_balance fires FOR EACH ROW,
    // so a bulk insert already moves every account. Adjusting them by hand as
    // well double-counted the whole import.
    const { error } = await supabase.from('transactions').insert(inserts)
    if (error) throw error

    return { imported: inserts.length, errors }
  },

  /** Filename stamp shared by the backup download. */
  backupFilename(): string {
    return `expense-tracker-backup-${toISODate(new Date())}.json`
  },
}
