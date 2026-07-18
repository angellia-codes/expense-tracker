import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCategories } from '@/features/categories/useCategories'
import { useCreateBudget, useUpdateBudget } from './useBudgets'
import { asNumber, budgetSchema, type BudgetFormData } from '@/utils/validation'
import { formatMonthYear } from '@/utils/date'
import type { BudgetWithSpending } from '@/types'

interface BudgetFormModalProps {
  isOpen: boolean
  onClose: () => void
  budgetToEdit?: BudgetWithSpending | null
  month: number
  year: number
}

export function BudgetFormModal({ isOpen, onClose, budgetToEdit, month, year }: BudgetFormModalProps) {
  const { data: categories } = useCategories()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const isEditing = !!budgetToEdit

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { category_id: '', amount: 0, month, year }
  })

  useEffect(() => {
    if (!isOpen) return
    reset(budgetToEdit
      ? {
          category_id: budgetToEdit.category_id,
          amount: Number(budgetToEdit.amount),
          month: budgetToEdit.month,
          year: budgetToEdit.year,
        }
      : { category_id: '', amount: 0, month, year }
    )
  }, [isOpen, budgetToEdit, reset, month, year])

  const onSubmit = async (data: BudgetFormData) => {
    if (isEditing && budgetToEdit) {
      await updateBudget.mutateAsync({ id: budgetToEdit.id, updates: data })
    } else {
      await createBudget.mutateAsync(data)
    }
    onClose()
  }

  const isLoading = createBudget.isPending || updateBudget.isPending
  // Budgets cap spending, so only expense categories make sense here.
  const expenseCategories = categories?.filter(c => c.type === 'expense') || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Budget' : 'New Budget'}</DialogTitle>
            <DialogDescription>
              Set a spending cap for {formatMonthYear(month, year)}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                {...register('category_id')}
                disabled={isEditing}
                className="flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus disabled:opacity-50"
              >
                <option value="">Select a category</option>
                {expenseCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-sm text-danger">{errors.category_id.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Monthly Limit</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0"
                {...register('amount', asNumber)}
                error={errors.amount?.message}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEditing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
