import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from 'lucide-react'

export interface ThemeTrendItem {
  themeId?: string
  id?: string
  name: string
  description?: string | null
  color?: string | null
  currentCount: number
  previousCount: number | null
  percentChange?: number | null
  percentageChange?: number | null
  isSpiking?: boolean
  isSpike?: boolean
}

interface TrendCardProps {
  item: ThemeTrendItem
  onClick: () => void
}

export function TrendCard({ item, onClick }: TrendCardProps) {
  const percent = item.percentChange ?? item.percentageChange ?? null
  const isSpike = item.isSpiking ?? item.isSpike ?? false
  const isPositiveGrowth = (percent ?? 0) > 0
  const isZero = percent === 0 || percent === null

  return (
    <Card
      onClick={onClick}
      className={`p-5 relative transition-all hover:shadow-md ${
        isSpike
          ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
          : 'hover:border-indigo-200 dark:hover:border-indigo-900/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {item.name}
            </h3>
            {isSpike && (
              <Badge variant="spike" size="sm" className="gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                Spike Alert
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{item.description}</p>
          )}
        </div>

        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-600">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Current Period
          </span>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {item.currentCount}
          </p>
          <span className="text-[11px] text-zinc-400">vs {item.previousCount ?? 0} prev</span>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Trend Growth
          </span>
          <div className="flex items-center justify-end gap-1 mt-1">
            {isSpike ? (
              <div className="flex items-center gap-1 text-red-600 font-bold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{percent}%</span>
              </div>
            ) : isPositiveGrowth ? (
              <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{percent}%</span>
              </div>
            ) : isZero ? (
              <div className="flex items-center gap-1 text-zinc-500 font-semibold text-sm">
                <Minus className="w-4 h-4" />
                <span>0%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>{percent}%</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            {isSpike ? '>50% volume spike' : 'period-over-period'}
          </span>
        </div>
      </div>
    </Card>
  )
}
