import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCreateAccount, useUpdateAccount } from './useAccounts'
import { asNumber } from '@/utils/validation'
import type { Account } from '@/types'

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank', 'credit_card', 'e_wallet', 'investment']),
  balance: z.number(),
  // No `.default()` here: it makes zod's input and output types diverge, which
  // zodResolver cannot reconcile. The form supplies 'IDR' via defaultValues.
  currency: z.string().min(1, 'Currency is required'),
  color: z.string().optional(),
})

type AccountFormData = z.infer<typeof accountSchema>

interface AccountFormModalProps {
  isOpen: boolean
  onClose: () => void
  accountToEdit?: Account | null
}

export function AccountFormModal({ isOpen, onClose, accountToEdit }: AccountFormModalProps) {
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const isEditing = !!accountToEdit

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'cash',
      balance: 0,
      currency: 'IDR',
      color: '#3B82F6'
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        reset({
          name: accountToEdit.name,
          type: accountToEdit.type as any,
          balance: Number(accountToEdit.balance),
          currency: accountToEdit.currency || 'IDR',
          color: accountToEdit.color || '#3B82F6'
        })
      } else {
        reset({
          name: '',
          type: 'cash',
          balance: 0,
          currency: 'IDR',
          color: '#3B82F6'
        })
      }
    }
  }, [isOpen, accountToEdit, reset])

  const onSubmit = async (data: AccountFormData) => {
    if (isEditing) {
      await updateAccount.mutateAsync({ id: accountToEdit.id, updates: data })
    } else {
      await createAccount.mutateAsync(data)
    }
    onClose()
  }

  const isLoading = createAccount.isPending || updateAccount.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details of your account.' : 'Create a new account to track its balance.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="e.g. Main Wallet"
                {...register('name')}
                error={errors.name?.message}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <select 
                  id="type"
                  className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  {...register('type')}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="e_wallet">E-Wallet</option>
                  <option value="investment">Investment</option>
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="balance">Starting Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  {...register('balance', asNumber)}
                  error={errors.balance?.message}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color Label</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  className="h-10 w-16 p-1 cursor-pointer"
                  {...register('color')}
                />
                <Input
                  type="text"
                  placeholder="#HexCode"
                  className="flex-1"
                  {...register('color')}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEditing ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
