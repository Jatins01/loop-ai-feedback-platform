'use client'

import React, { useState, useEffect } from 'react'
import { Plus, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ReportCard, ReportItem } from '@/components/reports/ReportCard'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/providers/ToastProvider'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { error: toastError } = useToast()

  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const isViewer = session?.user?.role === 'VIEWER'

  useEffect(() => {
    let ignore = false

    async function loadReports() {
      try {
        const res = await fetch('/api/reports')
        if (!res.ok) {
          throw new Error('Failed to load reports')
        }
        const data = await res.json()
        if (!ignore) {
          setReports(data.data || [])
          setLoading(false)
        }
      } catch {
        if (!ignore) {
          toastError('Could not load historical reports.')
          setLoading(false)
        }
      }
    }

    loadReports()
    return () => {
      ignore = true
    }
  }, [refreshTrigger, toastError])

  const handleRefresh = () => {
    setLoading(true)
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleReportGenerated = (newId?: string) => {
    if (newId) {
      router.push(`/reports/${newId}`)
    } else {
      handleRefresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Voice-of-Customer Reports
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Automated executive digests synthesizing top themes, sentiment deltas, and real customer quotes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {!isViewer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGeneratorOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Generate Report
            </Button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-4">
          <FileText className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600" />
          <div className="max-w-sm mx-auto">
            <p className="font-semibold text-base text-zinc-800 dark:text-zinc-200">No Reports Generated Yet</p>
            <p className="text-xs text-zinc-400 mt-1">
              Select a date range to generate your company&apos;s first AI-synthesized Voice-of-Customer report.
            </p>
          </div>
          {!isViewer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGeneratorOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Generate First Report
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Generator Modal */}
      <ReportGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSuccess={handleReportGenerated}
      />
    </div>
  )
}
