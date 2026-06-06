"use client"

import { Logo } from "@/components/logo"
import { Search01Icon, FilterHorizontalIcon, Cancel01Icon } from "hugeicons-react"

interface NavbarProps {
  tab?: string
  showSearch?: boolean
  filterSearch?: string
  onToggleSearch?: () => void
  onSearchChange?: (value: string) => void
  onToggleFilter?: () => void
}

export function Navbar({ tab, showSearch, filterSearch, onToggleSearch, onSearchChange, onToggleFilter }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 lg:max-w-4xl">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-lg font-bold tracking-tight">RangeFrenzy</span>
        </div>
        {tab === "play" && !showSearch && (
          <div className="flex items-center gap-1">
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
          </div>
        )}
        {tab === "play" && showSearch && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search markets…"
              value={filterSearch ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-44 rounded-xl border border-input bg-muted px-3 text-sm outline-none ring-2 ring-transparent focus:ring-[#07955F]/30"
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
    </header>
  )
}
