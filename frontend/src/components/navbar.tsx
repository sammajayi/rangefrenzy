"use client"

import { useState } from "react"
import { Logo } from "@/components/logo"
import { Search01Icon, FilterHorizontalIcon, Cancel01Icon, Notification03Icon } from "hugeicons-react"
import { useNotifications } from "@/hooks/useNotifications"

interface NavbarProps {
  tab?: string
  showSearch?: boolean
  filterSearch?: string
  onToggleSearch?: () => void
  onSearchChange?: (value: string) => void
  onToggleFilter?: () => void
  username?: string
}

export function Navbar({ tab, showSearch, filterSearch, onToggleSearch, onSearchChange, onToggleFilter, username }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(username)

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
                className="h-9 w-36 rounded-xl border border-input bg-muted px-3 text-sm outline-none ring-2 ring-transparent focus:ring-[#07955F]/30"
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
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { if (!n.read) markAsRead(n.id); }}
                    className={`flex w-full items-start gap-2.5 border-t border-border px-3 py-2.5 text-left transition hover:bg-accent ${n.read ? "" : "bg-accent/30"}`}
                  >
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </header>
  )
}
