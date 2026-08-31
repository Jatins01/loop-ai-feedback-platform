'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/providers/ToastProvider'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImportCsvModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportSummary {
  importedCount: number
  failedCount: number
  errors?: Array<{ row: number; reason: string }>
}

export function ImportCsvModal({ isOpen, onClose, onSuccess }: ImportCsvModalProps) {
  const { error: toastError, success: toastSuccess } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setSummary(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toastError('Please choose a CSV file to upload.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/feedback/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import CSV')
      }

      setSummary(data)
      toastSuccess(`Imported ${data.importedCount} feedback items successfully!`)
      onSuccess()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Error importing CSV')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setSummary(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={reset}
      title="Bulk Import Feedback CSV"
      description="Upload a CSV file containing columns: content, channel, customer_label (optional), created_at (optional)"
    >
      {!summary ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              id="csv-upload"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mb-2">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {file ? file.name : 'Click to select CSV file'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard UTF-8 CSV exports up to 10MB'}
              </p>
            </label>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-900 dark:text-zinc-200">Supported CSV Columns:</p>
            <p>• <code className="text-indigo-600 dark:text-indigo-400">content</code> (Required): Feedback body</p>
            <p>• <code className="text-indigo-600 dark:text-indigo-400">channel</code>: support_ticket, app_review, nps_survey, sales_note, community_post</p>
            <p>• <code className="text-indigo-600 dark:text-indigo-400">customer_label</code>: Optional user or company tag</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={reset} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} disabled={!file} icon={<Upload className="w-4 h-4" />}>
              Start Import
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Import Complete</p>
              <p className="text-xs mt-0.5">
                Successfully processed <strong>{summary.importedCount}</strong> records.{' '}
                {summary.failedCount > 0 && `(${summary.failedCount} rows failed)`}
              </p>
            </div>
          </div>

          {summary.errors && summary.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs">
              <p className="font-semibold text-rose-600 flex items-center gap-1 mb-1">
                <AlertCircle className="w-4 h-4" /> Failed rows:
              </p>
              {summary.errors.map((err, i) => (
                <p key={i} className="text-zinc-600 dark:text-zinc-400">
                  Row {err.row}: {err.reason}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={reset}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
