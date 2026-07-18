import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency, formatPercentage } from '@/utils/currency'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'

interface StatCardProps {
  title: string
  amount: number
  change?: number
  isCurrency?: boolean
  trend?: 'up' | 'down' | 'neutral'
  delay?: number
}

export function StatCard({ 
  title, 
  amount, 
  change, 
  isCurrency = true,
  trend,
  delay = 0 
}: StatCardProps) {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  // Determine trend if not explicitly provided but change exists
  const actualTrend = trend || (
    change === undefined ? 'neutral' 
    : change > 0 ? 'up' 
    : change < 0 ? 'down' 
    : 'neutral'
  )

  const TrendIcon = actualTrend === 'up' ? TrendingUp : actualTrend === 'down' ? TrendingDown : Minus
  const trendColorClass = 
    actualTrend === 'up' ? 'text-success' : 
    actualTrend === 'down' ? 'text-danger' : 
    'text-text-secondary'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="hover:border-accent/30 transition-colors bg-bg-surface overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -z-10 blur-2xl"></div>
        <CardContent className="p-6">
          <p className="text-sm font-medium text-text-secondary mb-2">{title}</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-text-primary tabular-nums">
              {isCurrency ? formatCurrency(amount, currency) : amount.toLocaleString()}
            </h3>
            
            {change !== undefined && (
              <div className={`flex items-center text-sm font-medium ${trendColorClass}`}>
                <TrendIcon className="w-4 h-4 mr-1" />
                <span>{formatPercentage(Math.abs(change))}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
