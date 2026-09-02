'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LogOut,
  Building2,
  User as UserIcon,
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Sparkles,
  FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Trends', href: '/trends', icon: TrendingUp },
  { label: 'Ask LOOP', href: '/ask', icon: Sparkles },
  { label: 'Reports', href: '/reports', icon: FileText },
]

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const user = session?.user

  const roleVariant =
    user?.role === 'ADMIN' ? 'admin' : user?.role === 'ANALYST' ? 'analyst' : 'viewer'

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between shrink-0">
      {/* Workspace Indicator & Quick Nav */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Workspace</span>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              Demo Company
            </p>
          </div>
        </div>

        {/* Top Navigation Links for Quick Access */}
        <nav className="hidden md:flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-xs border border-indigo-200 dark:border-indigo-800">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="hidden sm:block text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.name || user.email}
                </span>
                <Badge variant={roleVariant} size="sm">
                  {user.role}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">{user.email}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          icon={<LogOut className="w-4 h-4 text-zinc-500" />}
          className="text-zinc-600 dark:text-zinc-400 hover:text-rose-600"
        >
          Sign Out
        </Button>
      </div>
    </header>
  )
}
