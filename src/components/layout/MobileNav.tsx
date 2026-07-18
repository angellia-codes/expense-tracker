import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { LayoutDashboard, ArrowRightLeft, Plus, PieChart, Wallet } from 'lucide-react'

export function MobileNav() {
  const location = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around h-full px-2">
        
        <NavItem 
          to="/dashboard" 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Home" 
          isActive={location.pathname === '/dashboard'} 
        />
        
        <NavItem 
          to="/transactions" 
          icon={<ArrowRightLeft className="w-5 h-5" />} 
          label="Transactions" 
          isActive={location.pathname.startsWith('/transactions')} 
        />
        
        {/* Center FAB (Floating Action Button) */}
        <div className="relative -top-5">
          <button className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white shadow-glow hover:bg-accent-hover transition-colors">
            <Plus className="w-6 h-6" />
          </button>
        </div>
        
        <NavItem 
          to="/budgets" 
          icon={<PieChart className="w-5 h-5" />} 
          label="Budgets" 
          isActive={location.pathname.startsWith('/budgets')} 
        />
        
        <NavItem 
          to="/accounts" 
          icon={<Wallet className="w-5 h-5" />} 
          label="Accounts" 
          isActive={location.pathname.startsWith('/accounts')} 
        />
        
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, isActive }: { to: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
        isActive ? "text-accent" : "text-text-secondary hover:text-text-primary"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
