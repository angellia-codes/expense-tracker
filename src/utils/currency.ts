/**
 * Currency formatting utilities
 * Default currency: IDR (Indonesian Rupiah)
 */

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string; decimals: number }> = {
  IDR: { locale: 'id-ID', symbol: 'Rp', decimals: 0 },
  USD: { locale: 'en-US', symbol: '$', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 },
  GBP: { locale: 'en-GB', symbol: '£', decimals: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥', decimals: 0 },
  SGD: { locale: 'en-SG', symbol: 'S$', decimals: 2 },
  MYR: { locale: 'ms-MY', symbol: 'RM', decimals: 2 },
  PHP: { locale: 'en-PH', symbol: '₱', decimals: 2 },
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'IDR',
  options?: { compact?: boolean; showSign?: boolean }
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.IDR

  if (options?.compact && Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Math.abs(millions))
    const sign = options.showSign && amount > 0 ? '+' : amount < 0 ? '-' : ''
    return `${sign}${config.symbol}${formatted}M`
  }

  if (options?.compact && Math.abs(amount) >= 1_000) {
    const thousands = amount / 1_000
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(Math.abs(thousands))
    const sign = options.showSign && amount > 0 ? '+' : amount < 0 ? '-' : ''
    return `${sign}${config.symbol}${formatted}K`
  }

  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(Math.abs(amount))

  if (options?.showSign && amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted.replace('-', '')}`
  return formatted
}

/**
 * Parse a currency string back to number
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string = 'IDR'): string {
  return CURRENCY_CONFIG[currency]?.symbol || currency
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Format a compact number (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toFixed(0)
}
