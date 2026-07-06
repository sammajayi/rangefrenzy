"use client"

import { useState, useCallback, useEffect } from "react"
import { Logo } from "@/components/logo"
import { Search01Icon, FilterHorizontalIcon, Cancel01Icon, Notification03Icon } from "hugeicons-react"
import { useNotifications, type Notification } from "@/hooks/useNotifications"

interface NavbarProps {
  tab?: string
  showSearch?: boolean
  filterSearch?: string
  onToggleSearch?: () => void
  onSearchChange?: (value: string) => void
  onToggleFilter?: () => void
  username?: string
}

function NotifToast({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  const isWin = notif.title.toLowerCase().includes("won")

  return (
    <div className="fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${isWin ? "border-won/30 bg-won/10" : "border-border bg-card"}`}>
        <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isWin ? "bg-won" : "bg-primary"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{notif.title}</p>
          {notif.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.body}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition"
          aria-label="Dismiss"
        >
          <Cancel01Icon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function Navbar({ tab, showSearch, filterSearch, onToggleSearch, onSearchChange, onToggleFilter, username }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [toast, setToast] = useState<Notification | null>(null)

  const handleNew = useCallback((n: Notification) => {
    setToast(n)
  }, [])

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(username, handleNew)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 lg:max-w-4xl">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-lg font-bold tracking-tight">RangeFrenzy</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
            aria-label="Notifications"
          >
            <Notification03Icon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {tab === "play" && !showSearch && (
            <>
              <button
                type="button"
                onClick={onToggleSearch}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
              >
                <Search01Icon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onToggleFilter}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
              >
                <FilterHorizontalIcon className="h-5 w-5" />
              </button>
            </>
          )}
          {tab === "play" && showSearch && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search markets…"
                value={filterSearch ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-9 w-36 rounded-xl border border-input bg-muted px-3 text-sm outline-none ring-2 ring-transparent focus:ring-brand/30"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { onSearchChange?.(""); onToggleSearch?.(); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition"
              >
                <Cancel01Icon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications panel */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setShowNotifications(false)} />
          <div className="absolute right-4 top-full mt-2 z-[90] min-w-[280px] max-w-[320px] rounded-2xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="group relative border-t border-border">
                    <button
                      type="button"
                      onClick={() => { if (!n.read) markAsRead(n.id); }}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 pr-10 text-left transition hover:bg-accent ${n.read ? "" : "bg-accent/30"}`}
                    >
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100"
                      aria-label="Delete notification"
                    >
                      <Cancel01Icon className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* In-app toast for new notifications */}
      {toast && (
        <NotifToast notif={toast} onClose={() => setToast(null)} />
      )}
    </header>
  )
}
