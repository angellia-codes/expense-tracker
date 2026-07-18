import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCreateTransaction as useCreateTx, useUpdateTransaction as useUpdateTx } from './useTransactions'
import { ReceiptUpload } from '@/features/attachments/ReceiptUpload'
import { attachmentsService } from '@/features/attachments/attachmentsService'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useCategories } from '@/features/categories/useCategories'
import { usePaymentMethods } from '@/features/paymentMethods/usePaymentMethods'
import { asNumber, transactionSchema, type TransactionFormData } from '@/utils/validation'
import type { TransactionWithRelations } from '@/types'

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  transactionToEdit?: TransactionWithRelations | null
}

export function TransactionFormModal({ isOpen, onClose, transactionToEdit }: TransactionFormModalProps) {
  const createTx = useCreateTx()
  const updateTx = useUpdateTx()
  
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const { data: paymentMethods } = usePaymentMethods()

  // Receipts picked for a transaction that doesn't exist yet — uploaded once
  // the insert returns an id.
  const [pendingReceipts, setPendingReceipts] = useState<File[]>([])

  const isEditing = !!transactionToEdit

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: '',
      category_id: '',
      payment_method_id: '',
      merchant: '',
      notes: ''
    }
  })

  const txType = watch('type')

  // Set default account when accounts load if none is selected
  useEffect(() => {
    if (accounts && accounts.length > 0 && !transactionToEdit) {
      setValue('account_id', accounts[0].id)
    }
  }, [accounts, setValue, transactionToEdit])

  useEffect(() => {
    if (isOpen) {
      // Staged receipts belong to one open-and-save cycle, never the next.
      setPendingReceipts([])
      if (transactionToEdit) {
        reset({
          type: transactionToEdit.type as any,
          amount: Number(transactionToEdit.amount),
          date: transactionToEdit.date,
          account_id: transactionToEdit.account_id,
          category_id: transactionToEdit.category_id,
          transfer_to_account_id: transactionToEdit.transfer_to_account_id,
          payment_method_id: transactionToEdit.payment_method_id,
          merchant: transactionToEdit.merchant || '',
          notes: transactionToEdit.notes || ''
        })
      } else {
        reset({
          type: 'expense',
          amount: 0,
          date: format(new Date(), 'yyyy-MM-dd'),
          account_id: accounts?.[0]?.id || '',
          category_id: '',
          payment_method_id: '',
          merchant: '',
          notes: ''
        })
      }
    }
  }, [isOpen, transactionToEdit, reset, accounts])

  const onSubmit = async (formData: TransactionFormData) => {
    // Unpicked <select>s hand back '', which Postgres rejects for a uuid column.
    // Transfers also have to clear the category they can't have.
    const data = {
      ...formData,
      category_id: formData.type === 'transfer' ? null : formData.category_id || null,
      transfer_to_account_id: formData.type === 'transfer' ? formData.transfer_to_account_id || null : null,
      payment_method_id: formData.payment_method_id || null,
    }

    if (isEditing && transactionToEdit) {
      await updateTx.mutateAsync({ id: transactionToEdit.id, updates: data })
    } else {
      const created = await createTx.mutateAsync(data)
      // Receipts are secondary: a failed upload reports itself but must not
      // undo a transaction that already saved.
      for (const file of pendingReceipts) {
        try {
          await attachmentsService.uploadReceipt(created.id, file)
        } catch (error: any) {
          toast.error(`${file.name}: ${error.message || 'upload failed'}`)
        }
      }
    }
    onClose()
  }

  const isLoading = createTx.isPending || updateTx.isPending

  const filteredCategories = categories?.filter(c => c.type === txType) || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modify your transaction details.' : 'Log a new expense, income, or transfer.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Transaction Type Tabs */}
            <div className="flex p-1 bg-bg-secondary rounded-lg border border-border">
              {(['expense', 'income', 'transfer'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('type', type)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                    txType === type 
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
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-text-tertiary sm:text-sm">Rp</span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    className="pl-8"
                    {...register('amount', asNumber)}
                    error={errors.amount?.message}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  error={errors.date?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="account_id">From Account</Label>
                <select 
                  id="account_id"
                  className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  {...register('account_id')}
                >
                  <option value="" disabled>Select account</option>
                  {accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                {errors.account_id && <p className="text-xs text-danger">{errors.account_id.message}</p>}
              </div>

              {txType === 'transfer' ? (
                <div className="grid gap-2">
                  <Label htmlFor="transfer_to_account_id">To Account</Label>
                  <select 
                    id="transfer_to_account_id"
                    className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    {...register('transfer_to_account_id')}
                  >
                    <option value="" disabled>Select destination</option>
                    {accounts?.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  {errors.transfer_to_account_id && <p className="text-xs text-danger">{errors.transfer_to_account_id.message}</p>}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="category_id">Category</Label>
                  <select 
                    id="category_id"
                    className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    {...register('category_id')}
                  >
                    <option value="" disabled>Select category</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-xs text-danger">{errors.category_id.message}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="merchant">{txType === 'income' ? 'Source / Payer' : 'Merchant / Payee'}</Label>
                <Input
                  id="merchant"
                  placeholder={txType === 'income' ? 'e.g. Acme Corp' : 'e.g. Starbucks'}
                  {...register('merchant')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_method_id">Payment method</Label>
                <select
                  id="payment_method_id"
                  className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  {...register('payment_method_id')}
                >
                  <option value="">None</option>
                  {paymentMethods?.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.icon} {pm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional description"
                {...register('notes')}
              />
            </div>

            <ReceiptUpload
              transactionId={transactionToEdit?.id}
              pendingFiles={pendingReceipts}
              onPendingChange={setPendingReceipts}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className={txType === 'income' ? 'bg-success hover:bg-success/90' : txType === 'expense' ? 'bg-danger hover:bg-danger/90' : 'bg-info hover:bg-info/90'}>
              {isEditing ? 'Save Changes' : `Add ${txType}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
