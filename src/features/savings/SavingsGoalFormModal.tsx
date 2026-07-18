import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCreateSavingsGoal, useUpdateSavingsGoal } from './useSavings'
import { asNumber, savingsGoalSchema, type SavingsGoalFormData } from '@/utils/validation'
import type { SavingsGoalWithProgress } from '@/types'

const EMPTY: SavingsGoalFormData = {
  name: '',
  target_amount: 0,
  current_amount: 0,
  deadline: null,
  icon: '🎯',
  color: '#10B981',
}

interface SavingsGoalFormModalProps {
  isOpen: boolean
  onClose: () => void
  goalToEdit?: SavingsGoalWithProgress | null
}

export function SavingsGoalFormModal({ isOpen, onClose, goalToEdit }: SavingsGoalFormModalProps) {
  const createGoal = useCreateSavingsGoal()
  const updateGoal = useUpdateSavingsGoal()
  const isEditing = !!goalToEdit

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!isOpen) return
    reset(goalToEdit
      ? {
          name: goalToEdit.name,
          target_amount: Number(goalToEdit.target_amount),
          current_amount: Number(goalToEdit.current_amount),
          deadline: goalToEdit.deadline,
          icon: goalToEdit.icon || '🎯',
          color: goalToEdit.color || '#10B981',
        }
      : EMPTY
    )
  }, [isOpen, goalToEdit, reset])

  const onSubmit = async (data: SavingsGoalFormData) => {
    // An empty date input submits '', which is not a valid DATE for Postgres.
    const payload = { ...data, deadline: data.deadline || null }
    if (isEditing && goalToEdit) {
      await updateGoal.mutateAsync({ id: goalToEdit.id, updates: payload })
    } else {
      await createGoal.mutateAsync(payload)
    }
    onClose()
  }

  const isLoading = createGoal.isPending || updateGoal.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your target or progress.' : 'Set something to save towards.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-[auto_1fr] gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">Emoji</Label>
                <Input
                  id="icon"
                  className="w-16 text-center text-lg"
                  {...register('icon')}
                  error={errors.icon?.message}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Emergency Fund"
                  {...register('name')}
                  error={errors.name?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="target_amount">Target</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="any"
                  {...register('target_amount', asNumber)}
                  error={errors.target_amount?.message}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current_amount">Saved so far</Label>
                <Input
                  id="current_amount"
                  type="number"
                  step="any"
                  {...register('current_amount', asNumber)}
                  error={errors.current_amount?.message}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Target Date (optional)</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
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
                <Input type="text" placeholder="#HexCode" className="flex-1" {...register('color')} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEditing ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
