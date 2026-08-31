import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'positive' | 'negative' | 'neutral' | 'admin' | 'analyst' | 'viewer' | 'spike' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  const variantClasses = {
    default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
    positive: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    negative: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    neutral: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    admin: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 font-semibold',
    analyst: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-semibold',
    viewer: 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-medium',
    spike: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-bold animate-pulse',
    outline: 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300',
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
