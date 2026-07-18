import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { useTransactions } from '@/features/transactions/useTransactions'
import { useCategories } from '@/features/categories/useCategories'
import { useAuth } from '@/features/auth/useAuth'
import { formatCurrency } from '@/utils/currency'
import { formatTransactionDate } from '@/utils/date'
import type { SearchResult } from '@/types'

const PAGES: { title: string; href: string }[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Transactions', href: '/transactions' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Categories', href: '/categories' },
  { title: 'Budgets', href: '/budgets' },
  { title: 'Savings', href: '/savings' },
  { title: 'Recurring', href: '/recurring' },
  { title: 'Reports', href: '/reports' },
  { title: 'Calendar', href: '/calendar' },
  { title: 'Settings', href: '/settings' },
]

type Item = SearchResult & { href: string }

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'IDR'

  // Both are already cached by their own pages; searching is pure in-memory
  // filtering, so no debounce and no search endpoint.
  const { data: transactions } = useTransactions()
  const { data: categories } = useCategories()

  const results = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const pages: Item[] = PAGES
      .filter(p => !q || p.title.toLowerCase().includes(q))
      .map(p => ({ type: 'category', id: `page-${p.href}`, title: p.title, subtitle: 'Page', icon: '→', href: p.href }))

    if (!q) return pages

    const cats: Item[] = (categories ?? [])
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map(c => ({
        type: 'category',
        id: `cat-${c.id}`,
        title: c.name,
        subtitle: `${c.type} category`,
        icon: c.icon || '📁',
        href: '/categories',
      }))

    const txs: Item[] = (transactions ?? [])
      .filter(tx =>
        tx.merchant?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q) ||
        tx.category?.name.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      )
      .slice(0, 8)
      .map(tx => ({
        type: 'transaction',
        id: `tx-${tx.id}`,
        title: tx.merchant || tx.category?.name || 'Transaction',
        subtitle: `${formatTransactionDate(tx.date)} · ${formatCurrency(Number(tx.amount), currency)}`,
        icon: tx.category?.icon || '💸',
        href: '/transactions',
      }))

    return [...pages, ...cats, ...txs]
  }, [query, transactions, categories, currency])

  // Reset when reopened, and keep the cursor inside the result list as it shrinks.
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    setActiveIndex(i => Math.min(i, Math.max(results.length - 1, 0)))
  }, [results.length])

  const go = (item: Item) => {
    navigate(item.href)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      go(results[activeIndex])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-xl top-[15%] translate-y-0" onKeyDown={onKeyDown}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions, categories, pages..."
            className="flex-1 bg-transparent py-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">No results for "{query}"</p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                onClick={() => go(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-bg-hover' : ''
                }`}
              >
                <span className="w-5 text-center shrink-0">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-text-primary truncate">{item.title}</span>
                  <span className="block text-xs text-text-secondary truncate">{item.subtitle}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Owns the Cmd/Ctrl+K shortcut so callers only render this. */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }
}
