import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { TransactionWithRelations } from '@/types'

const FORMATS = [
  { key: 'csv', label: 'CSV' },
  { key: 'xlsx', label: 'Excel (.xlsx)' },
  { key: 'pdf', label: 'PDF' },
] as const

/** Exports exactly the rows handed to it — whatever the page is showing. */
export function ExportMenu({ transactions }: { transactions: TransactionWithRelations[] }) {
  const [isOpen, setIsOpen] = useState(false)

  const run = async (format: (typeof FORMATS)[number]['key']) => {
    setIsOpen(false)
    if (!transactions.length) {
      toast.error('Nothing to export')
      return
    }
    try {
      // Dynamic: xlsx + jspdf are ~700 kB and nobody should pay for them on load.
      const { exportService } = await import('./exportService')
      exportService[format](transactions)
      toast.success(`Exported ${transactions.length} transactions`)
    } catch (error: any) {
      toast.error(error.message || 'Export failed')
    }
  }

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(o => !o)}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 z-50 rounded-lg border border-border bg-bg-elevated shadow-lg py-1">
            {FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => run(f.key)}
                className="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
