import React from 'react'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon: React.ReactNode
  variant?: 'default' | 'positive' | 'negative' | 'neutral'
}

export function StatCard({ title, value, subtext, icon, variant = 'default' }: StatCardProps) {
  const iconColors = {
    default: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
    positive: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    negative: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    neutral: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-2">
            {value}
          </p>
          {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3.5 rounded-2xl ${iconColors[variant]}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
