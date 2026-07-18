import { supabase } from '@/lib/supabase'
import { estimateCompletionDate, toISODate, differenceInMonths } from '@/utils/date'
import type { SavingsGoal, SavingsGoalInsert, SavingsGoalWithProgress } from '@/types'

export type CreateSavingsGoalDTO = Omit<SavingsGoalInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateSavingsGoalDTO = Partial<CreateSavingsGoalDTO>

export const savingsService = {
  async getGoals(): Promise<SavingsGoalWithProgress[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data ?? []).map((goal) => {
      const target = Number(goal.target_amount)
      const current = Number(goal.current_amount)

      // ponytail: contribution rate is inferred from total saved / months since
      // the goal was created — there is no contributions table to average over.
      // A goal funded in one lump sum will read as a high monthly rate.
      // Upgrade path: log contributions as rows and average the real history.
      const monthsElapsed = Math.max(1, differenceInMonths(new Date(), new Date(goal.created_at)))
      const monthlyContribution = current / monthsElapsed
      const completion = estimateCompletionDate(current, target, monthlyContribution)

      return {
        ...(goal as SavingsGoal),
        percentage: target > 0 ? (current / target) * 100 : 0,
        monthlyContribution,
        estimatedCompletionDate: completion ? toISODate(completion) : null,
      }
    })
  },

  async createGoal(goal: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ ...goal, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return data as SavingsGoal
  },

  async updateGoal(id: string, updates: UpdateSavingsGoalDTO): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SavingsGoal
  },

  /** Add to (or subtract from) the saved amount, flipping is_completed at the target. */
  async contribute(goal: SavingsGoal, amount: number): Promise<SavingsGoal> {
    const current = Math.max(0, Number(goal.current_amount) + amount)
    return savingsService.updateGoal(goal.id, {
      current_amount: current,
      is_completed: current >= Number(goal.target_amount),
    })
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
