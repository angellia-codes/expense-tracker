import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types'

// Read-only for now: handle_new_user() seeds every signup with a default set,
// and nothing yet asks to edit them. Add create/update here when it does.
export const paymentMethodsService = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data as PaymentMethod[]
  },
}
