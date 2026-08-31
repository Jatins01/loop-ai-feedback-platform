'use client'

import React, { useState } from 'react'
import { Sparkles, Send, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface QuestionInputProps {
  onSubmit: (question: string) => void
  isLoading: boolean
}

const SAMPLE_QUESTIONS = [
  'What are customers saying about onboarding and login?',
  'Are there any complaints regarding billing or invoice receipts?',
  'What features are power users requesting the most?',
  'How do users feel about the new dashboard UI performance?',
]

export function QuestionInput({ onSubmit, isLoading }: QuestionInputProps) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return
    onSubmit(question.trim())
    setQuestion('')
  }

  const handleChipClick = (sample: string) => {
    if (isLoading) return
    onSubmit(sample)
  }

  return (
    <div className="space-y-4">
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-md shadow-zinc-200/50 dark:shadow-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
          <div className="pl-3 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything about your customer feedback in plain English..."
            className="flex-1 px-2 py-2 text-sm bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!question.trim()}
            size="sm"
            className="rounded-xl px-4 py-2"
            icon={<Send className="w-4 h-4" />}
          >
            Ask LOOP
          </Button>
        </div>
      </form>

      {/* Suggested Questions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggested:
        </span>
        {SAMPLE_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleChipClick(q)}
            className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
