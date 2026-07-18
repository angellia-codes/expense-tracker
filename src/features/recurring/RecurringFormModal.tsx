import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCategories } from '@/features/categories/useCategories'
import { useCreateRecurring, useUpdateRecurring } from './useRecurring'
import { asNumber, recurringTransactionSchema, type RecurringTransactionFormData } from '@/utils/validation'
import { toISODate } from '@/utils/date'
import type { RecurringWithRelations } from './recurringService'

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const

interface RecurringFormModalProps {
  isOpen: boolean
  onClose: () => void
  ruleToEdit?: RecurringWithRelations | null
}

export function RecurringFormModal({ isOpen, onClose, ruleToEdit }: RecurringFormModalProps) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const createRule = useCreateRecurring()
  const updateRule = useUpdateRecurring()
  const isEditing = !!ruleToEdit

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RecurringTransactionFormData>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      amount: 0,
      type: 'expense',
      category_id: '',
      account_id: '',
      frequency: 'monthly',
      start_date: toISODate(new Date()),
      end_date: null,
      merchant: '',
      notes: '',
    }
  })

  const ruleType = watch('type')

  useEffect(() => {
    if (!isOpen) return
    reset(ruleToEdit
      ? {
          amount: Number(ruleToEdit.amount),
          type: ruleToEdit.type,
          category_id: ruleToEdit.category_id,
          account_id: ruleToEdit.account_id,
          payment_method_id: ruleToEdit.payment_method_id,
          frequency: ruleToEdit.frequency,
          start_date: ruleToEdit.start_date,
          end_date: ruleToEdit.end_date,
          merchant: ruleToEdit.merchant || '',
          notes: ruleToEdit.notes || '',
        }
      : {
          amount: 0,
          type: 'expense',
          category_id: '',
          account_id: accounts?.[0]?.id || '',
          frequency: 'monthly',
          start_date: toISODate(new Date()),
          end_date: null,
          merchant: '',
          notes: '',
        }
    )
  }, [isOpen, ruleToEdit, reset, accounts])

  const onSubmit = async (data: RecurringTransactionFormData) => {
    // Empty date inputs submit '', which Postgres rejects for a DATE column.
    const payload = { ...data, end_date: data.end_date || null }
    if (isEditing && ruleToEdit) {
      await updateRule.mutateAsync({ id: ruleToEdit.id, updates: payload })
    } else {
      await createRule.mutateAsync(payload)
    }
    onClose()
  }

  const isLoading = createRule.isPending || updateRule.isPending
  const filteredCategories = categories?.filter(c => c.type === ruleType) || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Recurring Rule' : 'New Recurring Rule'}</DialogTitle>
            <DialogDescription>
              Rules don't post themselves — you'll confirm each one when it's due.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex p-1 bg-bg-secondary rounded-lg border border-border">
              {(['expense', 'income'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('type', type)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                    ruleType === type
                      ? 'bg-bg-elevated text-text-primary shadow-sm border border-border/50'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  {...register('amount', asNumber)}
                  error={errors.amount?.message}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frequency</Label>
                <select id="frequency" className={SELECT_CLASS} {...register('frequency')}>
                  {FREQUENCIES.map(f => (
                    <option key={f} value={f} className="capitalize">{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="account_id">Account</Label>
                <select id="account_id" className={SELECT_CLASS} {...register('account_id')}>
                  <option value="" disabled>Select account</option>
                  {accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                {errors.account_id && <p className="text-xs text-danger">{errors.account_id.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <select id="category_id" className={SELECT_CLASS} {...register('category_id')}>
                  <option value="" disabled>Select category</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-xs text-danger">{errors.category_id.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Starts</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  error={errors.start_date?.message}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Ends (optional)</Label>
                <Input id="end_date" type="date" {...register('end_date')} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="merchant">Payee / Merchant</Label>
              <Input id="merchant" placeholder="e.g. Netflix" {...register('merchant')} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" placeholder="Optional" {...register('notes')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEditing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
