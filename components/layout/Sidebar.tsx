'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Sparkles,
  FileText,
  MessageSquareQuote,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Feedback Inbox', href: '/inbox', icon: Inbox },
  { label: 'Theme Trends', href: '/trends', icon: TrendingUp },
  { label: 'Ask LOOP (Q&A)', href: '/ask', icon: Sparkles },
  { label: 'VoC Reports', href: '/reports', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-zinc-900 text-zinc-100 flex flex-col justify-between border-r border-zinc-800 min-h-screen">
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-base text-white">Project LOOP</h1>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">AI Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 font-semibold shadow-xs border border-indigo-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800/80 text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <span>Version 1.0</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
          </span>
        </div>
      </div>
    </aside>
  )
}
