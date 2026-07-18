import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Folder, Trash2, Pencil } from 'lucide-react'
import { useCategories, useDeleteCategory } from './useCategories'
import { CategoryFormModal } from './CategoryFormModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const deleteCategory = useDeleteCategory()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setCategoryToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" category? This will fail if there are transactions using this category.`)) {
      await deleteCategory.mutateAsync(id)
    }
  }

  const filteredCategories = categories?.filter(c => c.type === activeTab) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48"></div>
        <div className="skeleton h-10 w-full max-w-xs rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-24 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Categories</h1>
          <p className="text-text-secondary mt-1">Manage the categories used for your transactions.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="flex p-1 bg-bg-secondary rounded-lg border border-border w-full max-w-sm">
        {(['expense', 'income'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              activeTab === type 
                ? 'bg-bg-elevated text-text-primary shadow-sm border border-border/50' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {type}s
          </button>
        ))}
      </div>

      {(!filteredCategories || filteredCategories.length === 0) ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Folder className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No categories found</h3>
          <p className="text-text-secondary mt-1 mb-4">You haven't set up any {activeTab} categories.</p>
          <Button onClick={handleCreate} variant="outline">
            Create your first category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredCategories.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="h-full hover:border-border/80 transition-colors group relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 w-1 bottom-0" 
                  style={{ backgroundColor: category.color || '#6366F1' }}
                />
                <CardContent className="p-4 pl-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{category.icon}</span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(category)}
                        className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(category.id, category.name)}
                        className="p-1 text-text-tertiary hover:text-danger rounded transition-colors"
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-text-primary text-sm truncate" title={category.name}>
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CategoryFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        categoryToEdit={categoryToEdit}
        defaultType={activeTab}
      />
    </div>
  )
}
