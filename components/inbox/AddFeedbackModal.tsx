'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/providers/ToastProvider'
import { Sparkles } from 'lucide-react'

interface AddFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CHANNELS = [
  { value: 'support_ticket', label: 'Support Ticket' },
  { value: 'app_review', label: 'App Store Review' },
  { value: 'nps_survey', label: 'NPS / CSAT Survey' },
  { value: 'sales_note', label: 'Sales Note' },
  { value: 'community_post', label: 'Community Post' },
]

export function AddFeedbackModal({ isOpen, onClose, onSuccess }: AddFeedbackModalProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState('support_ticket')
  const [customerLabel, setCustomerLabel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toastError('Feedback content is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          channel,
          customerLabel: customerLabel.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      toastSuccess('Feedback ingested and auto-classified with AI!')
      setContent('')
      setCustomerLabel('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Error creating feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Customer Feedback"
      description="Ingest single feedback item with automatic AI sentiment & theme classification"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Channel Source
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="block w-full px-3 py-2.5 sm:text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
          >
            {CHANNELS.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Customer Name / Identifier (Optional)
          </label>
          <input
            type="text"
            value={customerLabel}
            onChange={(e) => setCustomerLabel(e.target.value)}
            placeholder="e.g. Enterprise Client A, User #4892"
            className="block w-full px-3 py-2.5 sm:text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            Feedback Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            placeholder="Paste raw customer feedback, review comment, or transcript excerpt..."
            className="block w-full px-3 py-2.5 sm:text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
          />
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Claude AI will automatically classify sentiment and tag matching themes.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} icon={<Sparkles className="w-4 h-4" />}>
            Ingest & Classify
          </Button>
        </div>
      </form>
    </Modal>
  )
}
