import { useQuery } from '@tanstack/react-query'
import { paymentMethodsService } from './paymentMethodsService'

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsService.getPaymentMethods(),
  })
}
