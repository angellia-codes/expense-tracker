import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Repeat, Trash2, Pencil, Play, Pause } from 'lucide-react'
import { useRecurring, useDeleteRecurring, usePostOccurrence, useUpdateRecurring } from './useRecurring'
import { isDue, type RecurringWithRelations } from './recurringService'
import { RecurringFormModal } from './RecurringFormModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { useAuth } from '@/features/auth/useAuth'

export function RecurringPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  const { data: rules, isLoading } = useRecurring()
  const deleteRule = useDeleteRecurring()
  const updateRule = useUpdateRecurring()
  const postOccurrence = usePostOccurrence()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ruleToEdit, setRuleToEdit] = useState<RecurringWithRelations | null>(null)

  const handleEdit = (rule: RecurringWithRelations) => {
    setRuleToEdit(rule)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setRuleToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete the recurring rule for "${name}"? Transactions already posted are kept.`)) {
      await deleteRule.mutateAsync(id)
    }
  }

  const dueRules = rules?.filter(r => isDue(r)) ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-56"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Recurring</h1>
          <p className="text-text-secondary mt-1">Bills and income that repeat on a schedule.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {dueRules.length > 0 && (
        <Card className="border-warning/40 bg-warning-light">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-primary">
              <strong>{dueRules.length}</strong> rule{dueRules.length === 1 ? ' is' : 's are'} due to be posted.
            </p>
            <Button
              size="sm"
              onClick={async () => {
                // Sequential on purpose: each post writes a transaction and the
                // balance trigger fires per row.
                for (const rule of dueRules) await postOccurrence.mutateAsync(rule)
              }}
              isLoading={postOccurrence.isPending}
            >
              Post all due
            </Button>
          </CardContent>
        </Card>
      )}

      {!rules?.length ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Repeat className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No recurring rules yet</h3>
          <p className="text-text-secondary mt-1 mb-4">Set up your rent, subscriptions, or salary.</p>
          <Button onClick={handleCreate} variant="outline">
            Create your first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, i) => {
            const due = isDue(rule)
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={`group hover:border-border/80 transition-colors ${rule.is_active ? '' : 'opacity-60'}`}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{rule.category?.icon || '🔁'}</span>
                      <div className="min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                          {rule.merchant || rule.category?.name || 'Recurring'}
                        </h3>
                        <p className="text-sm text-text-secondary capitalize">
                          {rule.frequency} · {rule.account?.name || 'No account'}
                          {rule.next_occurrence && ` · next ${formatDate(rule.next_occurrence)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {due && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => postOccurrence.mutateAsync(rule)}
                          disabled={postOccurrence.isPending}
                        >
                          Post now
                        </Button>
                      )}
                      <span className={`font-semibold tabular-nums ${rule.type === 'income' ? 'text-success' : 'text-text-primary'}`}>
                        {rule.type === 'income' ? '+' : '−'}{formatCurrency(Number(rule.amount), currency)}
                      </span>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updateRule.mutateAsync({ id: rule.id, updates: { is_active: !rule.is_active } })}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                          aria-label={rule.is_active ? 'Pause rule' : 'Resume rule'}
                        >
                          {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                          aria-label="Edit rule"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id, rule.merchant || rule.category?.name || 'this rule')}
                          className="p-1.5 text-text-tertiary hover:text-danger hover:bg-danger-light rounded-md transition-colors"
                          disabled={deleteRule.isPending}
                          aria-label="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <RecurringFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ruleToEdit={ruleToEdit}
      />
    </div>
  )
}
