// Re-export all database types.
// The `import type` is separate on purpose: `export ... from` does NOT create
// local bindings, so the interfaces below could not extend the re-exported names.
import type {
  Transaction,
  Category,
  Account,
  PaymentMethod,
  Tag,
  Attachment,
  Budget,
  SavingsGoal,
} from './database'

export type * from './database'

// ===== App-level types =====

export type TransactionType = 'income' | 'expense' | 'transfer'
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment'
export type CategoryType = 'income' | 'expense'
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type NotificationType = 'budget_exceeded' | 'upcoming_bill' | 'recurring_payment' | 'savings_milestone' | 'unusual_spending'
export type Theme = 'light' | 'dark' | 'system'
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

// Extended transaction with joined data
export interface TransactionWithRelations extends Transaction {
  category?: Category | null
  account?: Account | null
  transfer_to_account?: Account | null
  payment_method?: PaymentMethod | null
  tags?: Tag[]
  attachments?: Attachment[]
}

// Dashboard summary
export interface DashboardSummary {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlySavings: number
  budgetRemaining: number
  netWorth: number
  incomeChange: number
  expenseChange: number
}

// Chart data
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface TimeSeriesPoint {
  date: string
  income: number
  expense: number
}

// Filter state
export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  type?: TransactionType | ''
  categoryIds?: string[]
  accountIds?: string[]
  amountMin?: number
  amountMax?: number
  tagIds?: string[]
  paymentMethodId?: string
  merchant?: string
  search?: string
}

// Sort
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Pagination
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

// Budget with spending
export interface BudgetWithSpending extends Budget {
  category?: Category
  spent: number
  remaining: number
  percentage: number
}

// Savings goal with progress
export interface SavingsGoalWithProgress extends SavingsGoal {
  percentage: number
  estimatedCompletionDate: string | null
  monthlyContribution: number
}

// Insight
export interface Insight {
  id: string
  type: 'increase' | 'decrease' | 'tip' | 'warning' | 'milestone'
  title: string
  description: string
  value?: number
  change?: number
  category?: string
  icon: string
}

// Search result
export interface SearchResult {
  type: 'transaction' | 'category' | 'merchant' | 'tag'
  id: string
  title: string
  subtitle: string
  icon?: string
}
