import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-bg-primary overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 relative">
          {/* Routes are lazy-loaded; this covers the chunk fetch. */}
          <Suspense fallback={<div className="skeleton h-64 w-full rounded-xl" />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  )
}
