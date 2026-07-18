import { Search, Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'
import { CommandPalette, useCommandPalette } from '@/features/search/CommandPalette'

export function Header() {
  const { profile } = useAuth()
  const palette = useCommandPalette()

  return (
    <header className="h-[var(--header-height)] flex-shrink-0 border-b border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        
        {/* Mobile Left: Menu Toggle & Brand */}
        <div className="flex items-center gap-3 md:hidden">
          <button className="p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-md">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>

        {/* Desktop Left: Global Search (Cmd+K) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <button onClick={palette.open} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-tertiary bg-bg-secondary hover:bg-bg-hover border border-border rounded-md transition-colors">
            <Search className="w-4 h-4" />
            <span>Search transactions, categories...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-border bg-bg-primary px-1.5 font-mono text-[10px] font-medium text-text-secondary opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto md:gap-4">
          {/* Mobile search entry — the desktop bar is hidden below md */}
          <button
            onClick={palette.open}
            aria-label="Search"
            className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <NotificationsBell />

          <div className="h-6 w-px bg-border mx-1 hidden md:block" />

          <button className="flex items-center gap-2 p-1 pl-2 pr-1 hover:bg-bg-hover rounded-full transition-colors">
            <span className="text-sm font-medium hidden md:block text-text-primary max-w-[120px] truncate">
              {profile?.full_name || 'User'}
            </span>
            <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-accent">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} />
    </header>
  )
}
