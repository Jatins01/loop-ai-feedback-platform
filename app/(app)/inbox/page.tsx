'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Upload, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/inbox/FilterBar'
import { FeedbackTable, FeedbackItem } from '@/components/inbox/FeedbackTable'
import { AddFeedbackModal } from '@/components/inbox/AddFeedbackModal'
import { ImportCsvModal } from '@/components/inbox/ImportCsvModal'
import { useToast } from '@/components/providers/ToastProvider'
import { useSession } from 'next-auth/react'

const SAMPLE_SIMULATION_ITEMS = [
  { content: 'The checkout flow failed 3 times when trying to add international billing address.', channel: 'support_ticket', customerLabel: 'Global User' },
  { content: 'New dashboard analytics load 5x faster than before. Great work team!', channel: 'app_review', customerLabel: 'VIP Customer' },
  { content: 'Our team needs SAML SSO integration before we can roll out Project LOOP company-wide.', channel: 'sales_note', customerLabel: 'Enterprise Lead' },
  { content: 'Love the new CSV bulk export feature, saved our support ops 2 hours this week.', channel: 'community_post', customerLabel: 'Power User' },
]

export default function InboxPage() {
  const { data: session } = useSession()
  const { error: toastError, success: toastSuccess } = useToast()

  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filter & pagination state
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 1,
  })

  const isViewer = session?.user?.role === 'VIEWER'

  useEffect(() => {
    let ignore = false

    async function loadFeedback() {
      try {
        const url = new URL('/api/feedback', window.location.origin)
        url.searchParams.set('page', String(page))
        url.searchParams.set('limit', '15')
        if (search) url.searchParams.set('q', search)
        if (channel) url.searchParams.set('channel', channel)
        if (sentiment) url.searchParams.set('sentiment', sentiment)
        if (status) url.searchParams.set('status', status)

        const res = await fetch(url.toString())
        if (!res.ok) {
          throw new Error('Failed to load feedback records')
        }
        const data = await res.json()
        if (!ignore) {
          setItems(data.data || [])
          setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 1 })
          setLoading(false)
        }
      } catch {
        if (!ignore) {
          toastError('Could not fetch feedback list.')
          setLoading(false)
        }
      }
    }

    loadFeedback()
    return () => {
      ignore = true
    }
  }, [page, search, channel, sentiment, status, refreshTrigger, toastError])

  const handleResetFilters = () => {
    setLoading(true)
    setSearch('')
    setChannel('')
    setSentiment('')
    setStatus('')
    setPage(1)
  }

  const triggerRefresh = () => {
    setLoading(true)
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSimulate = async () => {
    if (isViewer) return
    setSimulating(true)
    try {
      const randomSample = SAMPLE_SIMULATION_ITEMS[Math.floor(Math.random() * SAMPLE_SIMULATION_ITEMS.length)]
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(randomSample),
      })

      if (!res.ok) {
        throw new Error('Simulation failed')
      }

      toastSuccess('Simulated incoming customer feedback item ingested and auto-classified!')
      triggerRefresh()
    } catch {
      toastError('Could not simulate incoming feedback.')
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Customer Feedback Inbox
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Search, filter, auto-classify, and triage multi-channel customer inputs
          </p>
        </div>

        {!isViewer && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              isLoading={simulating}
              onClick={handleSimulate}
              icon={<PlayCircle className="w-4 h-4 text-indigo-500" />}
            >
              Simulate Ingestion
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              icon={<Upload className="w-4 h-4" />}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Feedback
            </Button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setLoading(true)
          setSearch(val)
          setPage(1)
        }}
        channel={channel}
        onChannelChange={(val) => {
          setLoading(true)
          setChannel(val)
          setPage(1)
        }}
        sentiment={sentiment}
        onSentimentChange={(val) => {
          setLoading(true)
          setSentiment(val)
          setPage(1)
        }}
        status={status}
        onStatusChange={(val) => {
          setLoading(true)
          setStatus(val)
          setPage(1)
        }}
        onReset={handleResetFilters}
      />

      {/* Feedback Table */}
      <FeedbackTable
        items={items}
        loading={loading}
        pagination={pagination}
        onPageChange={(newPage) => {
          setLoading(true)
          setPage(newPage)
        }}
        onItemUpdated={triggerRefresh}
      />

      {/* Modals */}
      <AddFeedbackModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={triggerRefresh}
      />

      <ImportCsvModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={triggerRefresh}
      />
    </div>
  )
}
