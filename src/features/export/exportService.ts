import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, toISODate } from '@/utils/date'
import { toCsv } from '@/utils/csv'
import type { TransactionWithRelations } from '@/types'

const HEADERS = ['Date', 'Type', 'Merchant', 'Category', 'Account', 'Amount', 'Notes'] as const

function toRows(transactions: TransactionWithRelations[]): string[][] {
  return transactions.map(tx => [
    tx.date,
    tx.type,
    tx.merchant ?? '',
    tx.category?.name ?? '',
    tx.account?.name ?? '',
    // Signed so a spreadsheet sum is the net, not the gross turnover.
    (tx.type === 'expense' ? -Number(tx.amount) : Number(tx.amount)).toString(),
    tx.notes ?? '',
  ])
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function filename(ext: string) {
  return `transactions-${toISODate(new Date())}.${ext}`
}

export const exportService = {
  csv(transactions: TransactionWithRelations[]) {
    const text = toCsv([[...HEADERS], ...toRows(transactions)])
    // The BOM keeps Excel from mangling non-ASCII merchants.
    download(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }), filename('csv'))
  },

  xlsx(transactions: TransactionWithRelations[]) {
    const sheet = XLSX.utils.aoa_to_sheet([[...HEADERS], ...toRows(transactions)])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Transactions')
    XLSX.writeFile(book, filename('xlsx'))
  },

  pdf(transactions: TransactionWithRelations[]) {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Transactions', 14, 16)
    doc.setFontSize(9)
    doc.text(`Exported ${formatDate(new Date())} · ${transactions.length} rows`, 14, 22)
    autoTable(doc, {
      head: [[...HEADERS]],
      body: toRows(transactions),
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [124, 58, 237] },
    })
    doc.save(filename('pdf'))
  },
}
