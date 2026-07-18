import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useAuth } from '@/features/auth/useAuth'
import { formatCurrency } from '@/utils/currency'
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  PieChart, 
  Target, 
  Repeat, 
  Calendar, 
  Settings 
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Accounts', path: '/accounts', icon: Wallet },
  { name: 'Budgets', path: '/budgets', icon: PieChart },
  { name: 'Savings', path: '/savings', icon: Target },
  { name: 'Recurring', path: '/recurring', icon: Repeat },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'
  const { data: accounts } = useAccounts()
  const netWorth = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) ?? 0

  return (
    <aside className="w-[var(--sidebar-width)] h-full bg-bg-secondary border-r border-border flex flex-col transition-all duration-300">
      <div className="h-[var(--header-height)] flex items-center px-6 border-b border-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shadow-glow">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-text-primary">FinTrack</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                isActive 
                  ? "text-accent" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-accent-light rounded-lg z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 z-10" />
              <span className="z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-bg-elevated rounded-xl p-4 border border-border">
          <p className="text-xs font-medium text-text-secondary mb-2">Net Worth</p>
          <p className="text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(netWorth, currency, { compact: true })}
          </p>
        </div>
      </div>
    </aside>
  )
}
