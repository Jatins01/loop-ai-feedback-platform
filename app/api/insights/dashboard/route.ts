import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { requireAuth } from '@/lib/auth'
import { dashboardQuerySchema } from '@/lib/validations/feedback'
import { ZodError } from 'zod'

/**
 * GET /api/insights/dashboard
 * Aggregates dashboard analytics (stats, volume over time, sentiment breakdown, top themes)
 * scoped strictly to the authenticated user's workspace and active filters.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Enforce authentication
    const auth = await requireAuth()
    if (!auth.success) {
      return auth.response
    }

    // 2. Extract & validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const query = dashboardQuerySchema.parse(queryParams)

    // 3. Build unified base where clause strictly scoped to workspace
    const where: Prisma.FeedbackWhereInput = {
      workspaceId: auth.user.workspaceId,
    }

    if (query.channel) where.channel = query.channel
    if (query.sentiment) where.sentiment = query.sentiment
    if (query.status) where.status = query.status

    const fromDate = query.dateFrom ?? query.from
    const toDate = query.dateTo ?? query.to
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = fromDate
      if (toDate) where.createdAt.lte = toDate
    }

    // 4. Calculations for newThisWeek (last 7 days + respecting filters)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    let thisWeekGte = sevenDaysAgo
    if (fromDate && fromDate > sevenDaysAgo) {
      thisWeekGte = fromDate
    }

    const newThisWeekWhere: Prisma.FeedbackWhereInput = {
      ...where,
      createdAt: {
        ...(typeof where.createdAt === 'object' && where.createdAt ? where.createdAt : {}),
        gte: thisWeekGte,
      },
    }

    // 5. Execute database aggregations concurrently
    const [
      totalItems,
      negativeCount,
      newThisWeek,
      sentimentGroups,
      timestamps,
      themeCounts,
    ] = await Promise.all([
      // Total matching feedback items
      prisma.feedback.count({ where }),

      // Total negative feedback items within active filter
      prisma.feedback.count({
        where: { ...where, sentiment: 'NEG' },
      }),

      // Total items within last 7 days within active filter
      prisma.feedback.count({ where: newThisWeekWhere }),

      // Sentiment distribution aggregation
      prisma.feedback.groupBy({
        by: ['sentiment'],
        where,
        _count: {
          _all: true,
        },
      }),

      // Chronological timestamps for volume calculation
      prisma.feedback.findMany({
        where,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Theme feedback counts filtered by active conditions
      prisma.theme.findMany({
        where: {
          workspaceId: auth.user.workspaceId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              feedback: {
                where: {
                  feedback: where,
                },
              },
            },
          },
        },
      }),
    ])

    // 6. Compute stat card percentages
    const percentNegative =
      totalItems === 0
        ? 0
        : Math.round((negativeCount / totalItems) * 1000) / 10

    // 7. Compute sentiment breakdown mapping
    const sentimentBreakdown = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    for (const group of sentimentGroups) {
      if (group.sentiment === 'POS') {
        sentimentBreakdown.positive = group._count._all
      } else if (group.sentiment === 'NEU') {
        sentimentBreakdown.neutral = group._count._all
      } else if (group.sentiment === 'NEG') {
        sentimentBreakdown.negative = group._count._all
      }
    }

    // 8. Compute volume over time (daily or weekly for >60 day ranges)
    let isWeekly = false
    if (fromDate && toDate) {
      const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays > 60) {
        isWeekly = true
      }
    }

    const volumeMap = new Map<string, number>()
    for (const item of timestamps) {
      let dateKey: string
      if (isWeekly) {
        const d = new Date(item.createdAt)
        const day = d.getUTCDay()
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d.setUTCDate(diff))
        dateKey = monday.toISOString().slice(0, 10)
      } else {
        dateKey = item.createdAt.toISOString().slice(0, 10)
      }
      volumeMap.set(dateKey, (volumeMap.get(dateKey) ?? 0) + 1)
    }

    const volumeOverTime = Array.from(volumeMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 9. Compute top themes (sorted descending, max 10)
    const topThemes = themeCounts
      .map((theme) => ({
        themeId: theme.id,
        name: theme.name,
        count: theme._count.feedback,
      }))
      .filter((theme) => theme.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 10. Return structured response
    return NextResponse.json({
      data: {
        stats: {
          totalItems,
          percentNegative,
          newThisWeek,
        },
        volumeOverTime,
        sentimentBreakdown,
        topThemes,
      },
    })
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    console.error('Error calculating dashboard analytics:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
