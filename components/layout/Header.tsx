'use client'

import React from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Building2, User as UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { data: session } = useSession()
  const user = session?.user

  const roleVariant =
    user?.role === 'ADMIN' ? 'admin' : user?.role === 'ANALYST' ? 'analyst' : 'viewer'

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between shrink-0">
      {/* Workspace Indicator */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs text-zinc-500 font-medium">Workspace</span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Demo Company
          </p>
        </div>
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
