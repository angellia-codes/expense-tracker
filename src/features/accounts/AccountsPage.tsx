import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, CreditCard, Landmark, Smartphone, TrendingUp, Pencil, Trash2 } from 'lucide-react'
import { useAccounts, useDeleteAccount } from './useAccounts'
import { AccountFormModal } from './AccountFormModal'
import { formatCurrency } from '@/utils/currency'
import { useAuth } from '@/features/auth/useAuth'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Account } from '@/types'

const AccountIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case 'cash': return <Wallet className={className} />
    case 'bank': return <Landmark className={className} />
    case 'credit_card': return <CreditCard className={className} />
    case 'e_wallet': return <Smartphone className={className} />
    case 'investment': return <TrendingUp className={className} />
    default: return <Wallet className={className} />
  }
}

export function AccountsPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'
  
  const { data: accounts, isLoading } = useAccounts()
  const deleteAccount = useDeleteAccount()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)

  const handleEdit = (account: Account) => {
    setAccountToEdit(account)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setAccountToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the account "${name}"? This will also delete all associated transactions.`)) {
      await deleteAccount.mutateAsync(id)
    }
  }

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48"></div>
        <div className="skeleton h-32 w-full rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Accounts</h1>
          <p className="text-text-secondary mt-1">Manage your cash, bank accounts, and credit cards.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Total Net Worth / Balance Summary */}
      <Card className="bg-gradient-to-br from-accent/20 to-bg-primary border-accent/20">
        <CardContent className="p-6 sm:p-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">Total Balance</p>
            <h2 className="text-4xl font-bold text-text-primary tabular-nums">
              {formatCurrency(totalBalance, currency)}
            </h2>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-full bg-accent/20 items-center justify-center text-accent">
            <Landmark className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      {(!accounts || accounts.length === 0) ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Wallet className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary">No accounts found</h3>
          <p className="text-text-secondary mt-1 mb-4">You haven't set up any accounts yet.</p>
          <Button onClick={handleCreate} variant="outline">
            Create your first account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:border-border/80 transition-colors group relative overflow-hidden">
                {/* Decorative top border color line */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ backgroundColor: account.color || '#3B82F6' }}
                />
                
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: account.color || '#3B82F6' }}
                      >
                        <AccountIcon type={account.type} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">{account.name}</h3>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">
                          {account.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Dropdown (Simplified for now) */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(account)}
                        className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(account.id, account.name)}
                        className="p-1.5 text-text-tertiary hover:text-danger hover:bg-danger-light rounded-md transition-colors"
                        disabled={deleteAccount.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Current Balance</p>
                    <p className={`text-2xl font-bold tabular-nums ${Number(account.balance) < 0 ? 'text-danger' : 'text-text-primary'}`}>
                      {formatCurrency(Number(account.balance), account.currency || currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AccountFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        accountToEdit={accountToEdit}
      />
    </div>
  )
}
