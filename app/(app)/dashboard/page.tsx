'use client'

import React, { useEffect, useState } from 'react'
import {
  MessageSquare,
  TrendingDown,
  Sparkles,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { SentimentChart } from '@/components/dashboard/SentimentChart'
import { ThemesChart } from '@/components/dashboard/ThemesChart'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/providers/ToastProvider'

interface DashboardData {
  stats: {
    totalItems: number
    percentNegative: number
    newThisWeek: number
    sentimentBreakdown: {
      POS: number
      NEU: number
      NEG: number
    }
  }
  volumeOverTime: Array<{ date: string; count: number }>
  topThemes: Array<{ name: string; count: number; color?: string | null }>
}

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'support_ticket', label: 'Support Tickets' },
  { value: 'app_review', label: 'App Store Reviews' },
  { value: 'nps_survey', label: 'NPS Surveys' },
  { value: 'sales_note', label: 'Sales Notes' },
  { value: 'community_post', label: 'Community Posts' },
]

export default function DashboardPage() {
  const { error: toastError } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      try {
        const url = new URL('/api/insights/dashboard', window.location.origin)
        if (channel) url.searchParams.set('channel', channel)

        const res = await fetch(url.toString())
        if (!res.ok) {
          throw new Error('Failed to load dashboard metrics')
        }
        const json = await res.json()
        if (!ignore) {
          setData(json)
          setLoading(false)
        }
      } catch {
        if (!ignore) {
          toastError('Could not load dashboard data. Please try again.')
          setLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      ignore = true
    }
  }, [channel, refreshTrigger, toastError])

  const handleRefresh = () => {
    setLoading(true)
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Feedback Intelligence Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time analytics, auto-classified sentiment, and theme trends
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={channel}
              onChange={(e) => {
                setLoading(true)
                setChannel(e.target.value)
              }}
              className="text-xs bg-transparent border-none text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Total Feedback Items"
            value={data.stats.totalItems.toLocaleString()}
            subtext="All ingested multi-channel feedback"
            icon={<MessageSquare className="w-6 h-6" />}
            variant="default"
          />
          <StatCard
            title="Negative Sentiment"
            value={`${data.stats.percentNegative}%`}
            subtext={`${data.stats.sentimentBreakdown.NEG} negative issues flagged`}
            icon={<TrendingDown className="w-6 h-6" />}
            variant="negative"
          />
          <StatCard
            title="New This Week"
            value={data.stats.newThisWeek.toLocaleString()}
            subtext="Ingested in the last 7 days"
            icon={<Sparkles className="w-6 h-6" />}
            variant="positive"
          />
        </div>
      ) : null}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Over Time Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Feedback Volume Over Time"
            subtitle="Daily volume distribution for recent period"
          />
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : data ? (
              <VolumeChart data={data.volumeOverTime} />
            ) : null}
          </CardContent>
        </Card>

        {/* Sentiment Breakdown Donut */}
        <Card>
          <CardHeader
            title="Sentiment Distribution"
            subtitle="AI auto-classified sentiment ratio"
          />
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : data ? (
              <SentimentChart
                positive={data.stats.sentimentBreakdown.POS}
                neutral={data.stats.sentimentBreakdown.NEU}
                negative={data.stats.sentimentBreakdown.NEG}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Top Themes Bar Chart */}
      <Card>
        <CardHeader
          title="Top Emerging Feedback Themes"
          subtitle="Clustered by AI from customer feedback records"
        />
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : data ? (
            <ThemesChart data={data.topThemes} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
