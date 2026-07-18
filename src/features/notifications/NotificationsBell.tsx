import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from './useNotifications'

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, dismiss, dismissAll, unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[10px] font-semibold text-white flex items-center justify-center border border-bg-primary">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Click-anywhere-else to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-50 rounded-xl border border-border bg-bg-elevated shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-bg-elevated">
              <span className="font-semibold text-text-primary text-sm">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={() => dismissAll(notifications.map(n => n.id))}
                  className="text-xs text-accent hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-secondary">You're all caught up.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-bg-hover transition-colors group">
                    <span className="text-lg leading-none mt-0.5">{n.icon}</span>
                    <button
                      onClick={() => { navigate(n.href); setIsOpen(false) }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>
                    </button>
                    <button
                      onClick={() => dismiss(n.id)}
                      aria-label="Dismiss notification"
                      className="p-1 h-fit text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
