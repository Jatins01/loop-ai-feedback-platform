'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Printer,
  Sparkles,
  FileText,
  User,
  Quote,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/providers/ToastProvider'

interface ReportDetail {
  id: string
  title: string
  periodStart: string
  periodEnd: string
  createdAt: string
  generatedBy?: {
    name: string | null
    email: string
  } | null
  contentJson: {
    stats: {
      totalItems: number
      currentPeriod: {
        total: number
        positive: number
        neutral: number
        negative: number
        percentNegative: number
      }
      previousPeriod: {
        total: number
        percentNegative: number
      }
      topThemes: Array<{
        name: string
        count: number
      }>
      representativeQuotes: Array<{
        content: string
        sentiment: string
        channel: string
      }>
    }
    narrative: {
      executiveSummary?: string
      themeHighlights?: string
      sentimentAnalysis?: string
      recommendedActions?: string[] | string
    } | string
  }
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const { error: toastError } = useToast()

  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      setLoading(true)
      try {
        const res = await fetch(`/api/reports/${resolvedParams.id}`)
        if (!res.ok) {
          throw new Error('Report not found')
        }
        const data = await res.json()
        setReport(data)
      } catch {
        toastError('Could not load report details.')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [resolvedParams.id, toastError])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-16">
        <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Report Not Found</p>
        <Link href="/reports" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
          ← Return to Reports List
        </Link>
      </div>
    )
  }

  const dtCreated = new Date(report.createdAt)
  const dtStart = new Date(report.periodStart)
  const dtEnd = new Date(report.periodEnd)

  const formattedPeriod = `${!isNaN(dtStart.getTime()) ? dtStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : report.periodStart} – ${!isNaN(dtEnd.getTime()) ? dtEnd.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : report.periodEnd}`
  const formattedCreated = !isNaN(dtCreated.getTime()) ? dtCreated.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''

  const stats = report.contentJson?.stats
  const narrative = report.contentJson?.narrative

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Top Nav & Print Action */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          icon={<Printer className="w-4 h-4" />}
        >
          Print / Export PDF
        </Button>
      </div>

      {/* Report Document Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span>Voice of Customer Executive Report</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {report.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>Period: <strong>{formattedPeriod}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-zinc-400" />
            <span>Generated by <strong>{report.generatedBy?.name || report.generatedBy?.email || 'Admin'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Published: <strong>{formattedCreated}</strong></span>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Volume</span>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {stats.totalItems ?? stats.currentPeriod?.total ?? 0}
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">analyzed records</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Positive Sentiment</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {stats.currentPeriod?.positive ?? 0}
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">items</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Neutral Sentiment</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {stats.currentPeriod?.neutral ?? 0}
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">items</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Negative Ratio</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {stats.currentPeriod?.percentNegative ?? 0}%
            </p>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">{stats.currentPeriod?.negative ?? 0} negative items</span>
          </div>
        </div>
      )}

      {/* Report Narrative Sections */}
      {narrative && (
        <Card className="p-8 space-y-6">
          {typeof narrative === 'string' ? (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200">
              {narrative}
            </div>
          ) : (
            <div className="space-y-6 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {narrative.executiveSummary && (
                <div className="space-y-2">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Executive Summary
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                    {narrative.executiveSummary}
                  </p>
                </div>
              )}

              {narrative.themeHighlights && (
                <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Theme Highlights &amp; Emerging Issues
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                    {narrative.themeHighlights}
                  </p>
                </div>
              )}

              {narrative.sentimentAnalysis && (
                <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Sentiment Analysis
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                    {narrative.sentimentAnalysis}
                  </p>
                </div>
              )}

              {narrative.recommendedActions && (
                <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Recommended Action Items
                  </h3>
                  {Array.isArray(narrative.recommendedActions) ? (
                    <ul className="space-y-1.5 list-disc pl-5">
                      {narrative.recommendedActions.map((action, i) => (
                        <li key={i} className="text-zinc-700 dark:text-zinc-300">
                          {action}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-700 dark:text-zinc-300">{narrative.recommendedActions}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Representative Customer Quotes */}
      {stats?.representativeQuotes && stats.representativeQuotes.length > 0 && (
        <Card className="p-8 space-y-4">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Quote className="w-4 h-4 text-indigo-500" />
            Notable Customer Verbatim Quotes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.representativeQuotes.map((q, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-2"
              >
                <p className="italic text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  &ldquo;{q.content}&rdquo;
                </p>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 capitalize pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <span>Channel: {q.channel.replace(/_/g, ' ')}</span>
                  <span>{q.sentiment}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
