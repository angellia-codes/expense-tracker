/* ===================================================
   Database Types — Mirrors the Supabase PostgreSQL schema

   Hand-maintained; keep in sync with supabase/schema.sql.
   Every table needs a `Relationships` entry — supabase-js requires it to
   satisfy GenericSchema, and without it the whole client degrades to `never`.
   Embedded selects (`category:categories(*)`) are typed from these entries.
   Upgrade path: `supabase gen types typescript` once the CLI is set up.
   =================================================== */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          default_currency: string
          date_format: string
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          default_currency?: string
          date_format?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          default_currency?: string
          date_format?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment'
          balance: number
          currency: string
          icon: string | null
          color: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment'
          balance?: number
          currency?: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment'
          balance?: number
          currency?: string
          icon?: string | null
          color?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          icon: string | null
          color: string | null
          parent_id: string | null
          is_default: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          is_default?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'income' | 'expense'
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          is_default?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          icon?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          amount: number
          type: 'income' | 'expense' | 'transfer'
          category_id: string | null
          account_id: string
          transfer_to_account_id: string | null
          payment_method_id: string | null
          merchant: string | null
          notes: string | null
          is_recurring: boolean
          recurring_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          amount: number
          type: 'income' | 'expense' | 'transfer'
          category_id?: string | null
          account_id: string
          transfer_to_account_id?: string | null
          payment_method_id?: string | null
          merchant?: string | null
          notes?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          amount?: number
          type?: 'income' | 'expense' | 'transfer'
          category_id?: string | null
          account_id?: string
          transfer_to_account_id?: string | null
          payment_method_id?: string | null
          merchant?: string | null
          notes?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_transfer_to_account_id_fkey'
            columns: ['transfer_to_account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tags_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transaction_tags: {
        Row: {
          transaction_id: string
          tag_id: string
        }
        Insert: {
          transaction_id: string
          tag_id: string
        }
        Update: {
          transaction_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transaction_tags_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transaction_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
      attachments: {
        Row: {
          id: string
          transaction_id: string
          user_id: string
          file_path: string
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id: string
          file_path: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          file_path?: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attachments_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attachments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          month: number
          year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          month: number
          year: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          amount?: number
          month?: number
          year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budgets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'budgets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          deadline: string | null
          icon: string | null
          color: string | null
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          color?: string | null
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          color?: string | null
          is_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'savings_goals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      recurring_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'income' | 'expense'
          category_id: string
          account_id: string
          payment_method_id: string | null
          merchant: string | null
          notes: string | null
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date: string
          end_date: string | null
          next_occurrence: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'income' | 'expense'
          category_id: string
          account_id: string
          payment_method_id?: string | null
          merchant?: string | null
          notes?: string | null
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date: string
          end_date?: string | null
          next_occurrence?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          type?: 'income' | 'expense'
          category_id?: string
          account_id?: string
          payment_method_id?: string | null
          merchant?: string | null
          notes?: string | null
          frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date?: string
          end_date?: string | null
          next_occurrence?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recurring_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurring_transactions_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'budget_exceeded' | 'upcoming_bill' | 'recurring_payment' | 'savings_milestone' | 'unusual_spending'
          title: string
          message: string | null
          is_read: boolean
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'budget_exceeded' | 'upcoming_bill' | 'recurring_payment' | 'savings_milestone' | 'unusual_spending'
          title: string
          message?: string | null
          is_read?: boolean
          data?: Json | null
          created_at?: string
        }
        Update: {
          type?: 'budget_exceeded' | 'upcoming_bill' | 'recurring_payment' | 'savings_milestone' | 'unusual_spending'
          title?: string
          message?: string | null
          is_read?: boolean
          data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type TransactionTag = Database['public']['Tables']['transaction_tags']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
export type RecurringTransaction = Database['public']['Tables']['recurring_transactions']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type SavingsGoalInsert = Database['public']['Tables']['savings_goals']['Insert']
export type RecurringTransactionInsert = Database['public']['Tables']['recurring_transactions']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']
export type SavingsGoalUpdate = Database['public']['Tables']['savings_goals']['Update']
