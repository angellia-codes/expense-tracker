import { lazy } from 'react'
import type { ReactElement } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { AppLayout } from '@/components/layout/AppLayout'

// Auth pages load eagerly (they're the entry point); everything behind the
// login is split so recharts, jspdf and friends don't ship with the shell.
// AppLayout renders the <Suspense> boundary these need.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const BudgetsPage = lazy(() => import('@/features/budgets/BudgetsPage').then(m => ({ default: m.BudgetsPage })))
const SavingsGoalsPage = lazy(() => import('@/features/savings/SavingsGoalsPage').then(m => ({ default: m.SavingsGoalsPage })))
const RecurringPage = lazy(() => import('@/features/recurring/RecurringPage').then(m => ({ default: m.RecurringPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Auth Guard Wrapper
function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="skeleton w-12 h-12 rounded-full"></div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Public Route Wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return null
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  // Public Auth Routes
  {
    path: '/login',
    element: <PublicRoute><LoginPage /></PublicRoute>,
  },
  {
    path: '/register',
    element: <PublicRoute><RegisterPage /></PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><ForgotPasswordPage /></PublicRoute>,
  },
  // Protected Routes wrapped in AppLayout
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
      {
        path: 'accounts',
        element: <AccountsPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'budgets',
        element: <BudgetsPage />,
      },
      {
        path: 'savings',
        element: <SavingsGoalsPage />,
      },
      {
        path: 'recurring',
        element: <RecurringPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  // Catch-all
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
