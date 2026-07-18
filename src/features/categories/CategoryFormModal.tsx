import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCreateCategory, useUpdateCategory } from './useCategories'
import type { Category } from '@/types'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1, 'Emoji icon is required').max(10, 'Too long for an emoji'),
  color: z.string().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  categoryToEdit?: Category | null
  defaultType?: 'income' | 'expense'
}

export function CategoryFormModal({ isOpen, onClose, categoryToEdit, defaultType = 'expense' }: CategoryFormModalProps) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isEditing = !!categoryToEdit

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: defaultType,
      icon: '📁',
      color: '#6366F1'
    }
  })

  const catType = watch('type')

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type as any,
          icon: categoryToEdit.icon || '📁',
          color: categoryToEdit.color || '#6366F1'
        })
      } else {
        reset({
          name: '',
          type: defaultType,
          icon: '📁',
          color: '#6366F1'
        })
      }
    }
  }, [isOpen, categoryToEdit, reset, defaultType])

  const onSubmit = async (data: CategoryFormData) => {
    if (isEditing && categoryToEdit) {
      await updateCategory.mutateAsync({ id: categoryToEdit.id, updates: data })
    } else {
      await createCategory.mutateAsync(data)
    }
    onClose()
  }

  const isLoading = createCategory.isPending || updateCategory.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modify your custom category.' : 'Create a new category for your transactions.'}
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
                    catType === type 
                      ? 'bg-bg-elevated text-text-primary shadow-sm border border-border/50' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

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
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Groceries"
                  {...register('name')}
                  error={errors.name?.message}
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
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
