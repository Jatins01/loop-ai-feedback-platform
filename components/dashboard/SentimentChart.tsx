'use client'

import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

interface SentimentChartProps {
  positive: number
  neutral: number
  negative: number
}

const COLORS = {
  Positive: '#10b981', // Emerald
  Neutral: '#f59e0b',  // Amber
  Negative: '#ef4444', // Rose
}

export function SentimentChart({ positive, neutral, negative }: SentimentChartProps) {
  const total = positive + neutral + negative

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-zinc-400">
        No sentiment data available.
      </div>
    )
  }

  const data = [
    { name: 'Positive', value: positive, color: COLORS.Positive },
    { name: 'Neutral', value: neutral, color: COLORS.Neutral },
    { name: 'Negative', value: negative, color: COLORS.Negative },
  ].filter((d) => d.value > 0)

  return (
    <div className="h-72 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => {
              const num = Number(val)
              const pct = total > 0 ? Math.round((num / total) * 100) : 0
              return [`${num} items (${pct}%)`, '']
            }}
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
