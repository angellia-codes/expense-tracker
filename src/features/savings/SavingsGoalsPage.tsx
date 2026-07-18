import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Target, Trash2, Pencil, Check } from 'lucide-react'
import { useSavingsGoals, useDeleteSavingsGoal, useContribute } from './useSavings'
import { SavingsGoalFormModal } from './SavingsGoalFormModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { useAuth } from '@/features/auth/useAuth'
import type { SavingsGoalWithProgress } from '@/types'

export function SavingsGoalsPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  const { data: goals, isLoading } = useSavingsGoals()
  const deleteGoal = useDeleteSavingsGoal()
  const contribute = useContribute()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoalWithProgress | null>(null)

  const handleEdit = (goal: SavingsGoalWithProgress) => {
    setGoalToEdit(goal)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setGoalToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete the goal "${name}"? This cannot be undone.`)) {
      await deleteGoal.mutateAsync(id)
    }
  }

  const handleContribute = async (goal: SavingsGoalWithProgress) => {
    const input = window.prompt(`How much are you adding to "${goal.name}"?`)
    if (input === null) return
    const amount = Number(input)
    if (!Number.isFinite(amount) || amount === 0) return
    await contribute.mutateAsync({ goal, amount })
  }

  const totalSaved = goals?.reduce((sum, g) => sum + Number(g.current_amount), 0) ?? 0
  const totalTarget = goals?.reduce((sum, g) => sum + Number(g.target_amount), 0) ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48"></div>
        <div className="skeleton h-28 w-full rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Savings Goals</h1>
          <p className="text-text-secondary mt-1">Track what you're saving towards and how close you are.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {!goals?.length ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Target className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No savings goals yet</h3>
          <p className="text-text-secondary mt-1 mb-4">Set a target and start tracking your progress.</p>
          <Button onClick={handleCreate} variant="outline">
            Create your first goal
          </Button>
        </div>
      ) : (
        <>
          <Card className="bg-gradient-to-br from-success/20 to-bg-primary border-success/20">
            <CardContent className="p-6 sm:p-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Total Saved</p>
                <h2 className="text-4xl font-bold text-text-primary tabular-nums">
                  {formatCurrency(totalSaved, currency)}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  of {formatCurrency(totalTarget, currency)} across {goals.length} goal{goals.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-full bg-success/20 items-center justify-center text-success">
                <Target className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full hover:border-border/80 transition-colors group relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: goal.color || '#10B981' }}
                  />
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">{goal.icon || '🎯'}</span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-text-primary truncate" title={goal.name}>
                            {goal.name}
                          </h3>
                          {goal.is_completed && (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <Check className="w-3 h-3" /> Reached
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                          aria-label="Edit goal"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id, goal.name)}
                          className="p-1.5 text-text-tertiary hover:text-danger hover:bg-danger-light rounded-md transition-colors"
                          disabled={deleteGoal.isPending}
                          aria-label="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-2xl font-bold text-text-primary tabular-nums">
                        {formatCurrency(Number(goal.current_amount), currency)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        of {formatCurrency(Number(goal.target_amount), currency)}
                      </p>
                    </div>

                    <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(goal.percentage, 100)}%`,
                          backgroundColor: goal.color || '#10B981',
                        }}
                      />
                    </div>

                    <div className="text-xs text-text-secondary space-y-1 mb-4">
                      <p>{goal.percentage.toFixed(0)}% saved</p>
                      {goal.deadline && <p>Target date: {formatDate(goal.deadline)}</p>}
                      {!goal.is_completed && goal.estimatedCompletionDate && (
                        <p>At this rate: {formatDate(goal.estimatedCompletionDate)}</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full"
                      onClick={() => handleContribute(goal)}
                      disabled={contribute.isPending}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add funds
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <SavingsGoalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goalToEdit={goalToEdit}
      />
    </div>
  )
}
