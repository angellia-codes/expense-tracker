import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, PiggyBank, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBudgets, useDeleteBudget } from './useBudgets'
import { BudgetFormModal } from './BudgetFormModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/currency'
import { formatMonthYear, addMonths, getMonth, getYear } from '@/utils/date'
import type { BudgetWithSpending } from '@/types'

/** Bar colour tracks how close to the cap you are. */
function progressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-danger'
  if (percentage >= 80) return 'bg-warning'
  return 'bg-accent'
}

export function BudgetsPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const month = getMonth(viewDate) + 1
  const year = getYear(viewDate)

  const { data: budgets, isLoading } = useBudgets(month, year)
  const deleteBudget = useDeleteBudget()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [budgetToEdit, setBudgetToEdit] = useState<BudgetWithSpending | null>(null)

  const handleEdit = (budget: BudgetWithSpending) => {
    setBudgetToEdit(budget)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setBudgetToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete the budget for "${name}"? Your transactions are not affected.`)) {
      await deleteBudget.mutateAsync(id)
    }
  }

  const totalBudgeted = budgets?.reduce((sum, b) => sum + Number(b.amount), 0) ?? 0
  const totalSpent = budgets?.reduce((sum, b) => sum + b.spent, 0) ?? 0
  const totalPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Budgets</h1>
          <p className="text-text-secondary mt-1">Set monthly caps per category and track what's left.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewDate(d => addMonths(d, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-44 text-center font-medium text-text-primary">
          {formatMonthYear(month, year)}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewDate(d => addMonths(d, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-xl"></div>
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl"></div>)}
        </div>
      ) : !budgets?.length ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <PiggyBank className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No budgets for this month</h3>
          <p className="text-text-secondary mt-1 mb-4">Set a cap on a category to start tracking.</p>
          <Button onClick={handleCreate} variant="outline">
            Create your first budget
          </Button>
        </div>
      ) : (
        <>
          {/* Month summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div>
                  <p className="text-sm text-text-secondary">Spent this month</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {formatCurrency(totalSpent)}
                    <span className="text-base font-normal text-text-secondary">
                      {' '}of {formatCurrency(totalBudgeted)}
                    </span>
                  </p>
                </div>
                <p className={`text-sm font-medium ${totalSpent > totalBudgeted ? 'text-danger' : 'text-text-secondary'}`}>
                  {totalSpent > totalBudgeted
                    ? `${formatCurrency(totalSpent - totalBudgeted)} over`
                    : `${formatCurrency(totalBudgeted - totalSpent)} left`}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor(totalPercentage)}`}
                  style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Per-category budgets */}
          <div className="space-y-3">
            {budgets.map((budget, i) => {
              const isOver = budget.remaining < 0
              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="group hover:border-border/80 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{budget.category?.icon || '📁'}</span>
                          <div className="min-w-0">
                            <h3 className="font-medium text-text-primary truncate">
                              {budget.category?.name || 'Uncategorized'}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {formatCurrency(budget.spent)} of {formatCurrency(Number(budget.amount))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-sm font-medium ${isOver ? 'text-danger' : 'text-text-secondary'}`}>
                            {isOver
                              ? `${formatCurrency(Math.abs(budget.remaining))} over`
                              : `${formatCurrency(budget.remaining)} left`}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(budget)}
                              className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
                              aria-label="Edit budget"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(budget.id, budget.category?.name || 'this category')}
                              className="p-1 text-text-tertiary hover:text-danger rounded transition-colors"
                              disabled={deleteBudget.isPending}
                              aria-label="Delete budget"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressColor(budget.percentage)}`}
                          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        budgetToEdit={budgetToEdit}
        month={month}
        year={year}
      />
    </div>
  )
}
