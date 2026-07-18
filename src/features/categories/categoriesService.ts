import { supabase } from '@/lib/supabase'
import type { Category, CategoryInsert } from '@/types'

export type CreateCategoryDTO = Omit<CategoryInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
export type UpdateCategoryDTO = Partial<CreateCategoryDTO>

export const categoriesService = {
  async getCategories(): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return data as Category[]
  },

  async createCategory(category: CreateCategoryDTO): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async updateCategory(id: string, updates: UpdateCategoryDTO): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
