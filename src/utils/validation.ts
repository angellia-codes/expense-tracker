/**
 * Zod validation schemas shared across the application
 */
import { z } from 'zod'

/**
 * Spread into `register()` for number inputs: `register('amount', asNumber)`.
 *
 * A number input still hands react-hook-form a string, so the schema must
 * receive a real number. Use this rather than `z.coerce.number()` — coercion
 * widens zod's *input* type to `unknown`, which zodResolver cannot reconcile
 * with useForm's single type parameter. Empty maps to 0 rather than NaN so
 * the schema's own message ("must be greater than 0") is what the user sees.
 */
export const asNumber = {
  setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
}

// ===== Auth schemas =====
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// ===== Transaction schemas =====
export const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  type: z.enum(['income', 'expense', 'transfer']),
  category_id: z.string().nullable().optional(),
  account_id: z.string().min(1, 'Account is required'),
  transfer_to_account_id: z.string().nullable().optional(),
  payment_method_id: z.string().nullable().optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Transfers move between accounts and have no category; everything else needs one.
  if (data.type !== 'transfer' && !data.category_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Category is required', path: ['category_id'] })
  }
  if (data.type === 'transfer' && !data.transfer_to_account_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination account is required', path: ['transfer_to_account_id'] })
  }
  if (data.type === 'transfer' && data.account_id === data.transfer_to_account_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cannot transfer to the same account', path: ['transfer_to_account_id'] })
  }
})

// ===== Account schemas =====
// Note: no `.default()` on form schemas. It makes zod's input and output types
// diverge, which zodResolver cannot reconcile with useForm's single type param.
// Put defaults in the form's `defaultValues` instead — that's where RHF wants them.
export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['cash', 'bank', 'credit_card', 'e_wallet', 'investment']),
  balance: z.number(),
  currency: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

// ===== Category schemas =====
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().nullable().optional(),
})

// ===== Budget schemas =====
export const budgetSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Budget amount must be positive'),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
})

// ===== Savings goal schemas =====
export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  target_amount: z.number().positive('Target amount must be positive'),
  current_amount: z.number().min(0),
  deadline: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

// ===== Recurring transaction schemas =====
export const recurringTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Category is required'),
  account_id: z.string().min(1, 'Account is required'),
  payment_method_id: z.string().nullable().optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().nullable().optional(),
})

// ===== Settings schemas =====
// No .default() here on purpose: defaults live in schema.sql, and a Zod default
// makes the parsed input type optional while the output stays required, which
// react-hook-form's resolver refuses to reconcile.
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  default_currency: z.string().min(1, 'Pick a currency'),
  date_format: z.string().min(1, 'Pick a date format'),
  theme: z.enum(['light', 'dark', 'system']),
})

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type TransactionFormData = z.infer<typeof transactionSchema>
export type AccountFormData = z.infer<typeof accountSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type BudgetFormData = z.infer<typeof budgetSchema>
export type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
