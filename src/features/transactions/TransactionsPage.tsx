import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Search, Filter, Trash2, Pencil } from 'lucide-react'
import { useTransactions, useDeleteTransaction } from './useTransactions'
import { TransactionFormModal } from './TransactionFormModal'
import { getCurrencySymbol } from '@/utils/currency'
import { formatTransactionDate } from '@/utils/date'
import { useAuth } from '@/features/auth/useAuth'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ExportMenu } from '@/features/export/ExportMenu'
import type { TransactionWithRelations } from '@/types'

export function TransactionsPage() {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'
  
  const { data: transactions, isLoading } = useTransactions()
  const deleteTransaction = useDeleteTransaction()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<TransactionWithRelations | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleEdit = (tx: TransactionWithRelations) => {
    setTxToEdit(tx)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setTxToEdit(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await deleteTransaction.mutateAsync(id)
    }
  }

  const filteredTransactions = transactions?.filter(tx => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tx.merchant?.toLowerCase().includes(q) || 
      tx.notes?.toLowerCase().includes(q) ||
      tx.category?.name.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q)
    )
  }) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48"></div>
        <div className="skeleton h-12 w-full max-w-sm rounded-md"></div>
        <div className="skeleton h-[500px] w-full rounded-xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Transactions</h1>
          <p className="text-text-secondary mt-1">View and manage your complete history.</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto shadow-glow">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <ExportMenu transactions={filteredTransactions} />
      </div>

      {/* Transactions List */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {(!filteredTransactions || filteredTransactions.length === 0) ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-medium text-text-primary">No transactions found</h3>
              <p className="text-text-secondary mt-1 mb-6">
                {searchQuery ? "We couldn't find anything matching your search." : "You haven't logged any transactions yet."}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreate}>
                  Log your first transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredTransactions.map((tx, i) => (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }} // Cap delay
                  className="flex items-center justify-between p-4 hover:bg-bg-hover transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-success-light text-success' :
                      tx.type === 'expense' ? 'bg-danger-light text-danger' :
                      'bg-info-light text-info'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight className="w-6 h-6" /> :
                       tx.type === 'expense' ? <ArrowUpRight className="w-6 h-6" /> :
                       <ArrowRightLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text-primary">
                          {tx.merchant || tx.category?.name || 'Transfer'}
                        </p>
                        {tx.category && (
                          <span className="inline-flex items-center rounded-md bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary ring-1 ring-inset ring-border/50">
                            {tx.category.icon} {tx.category.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                        <span>{formatTransactionDate(tx.date)}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="truncate max-w-[120px]">{tx.account?.name}</span>
                        {tx.notes && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <span className="truncate max-w-[200px] italic">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(tx)}
                        className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-2 text-text-tertiary hover:text-danger hover:bg-danger-light rounded-md transition-colors"
                        disabled={deleteTransaction.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={`text-lg font-bold tabular-nums text-right min-w-[120px] ${
                      tx.type === 'income' ? 'text-success' :
                      tx.type === 'expense' ? 'text-text-primary' :
                      'text-text-secondary'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {getCurrencySymbol(currency)}{Number(tx.amount).toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        transactionToEdit={txToEdit}
      />
    </div>
  )
}
