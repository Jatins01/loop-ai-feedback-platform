import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getThemeTrendsQuerySchema } from '@/lib/validations/theme'
import { ZodError } from 'zod'

/**
 * Threshold percentage increase to classify a theme as "spiking"
 */
export const SPIKE_PERCENT_THRESHOLD = 50

/**
 * GET /api/themes/trends
 * Returns theme trend analysis and spike detection metrics for the authenticated workspace.
 * Supports period ("7d" | "30d") and compareToPrevious (boolean).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Enforce authentication strictly scoped to session
    const auth = await requireAuth()
    if (!auth.success) {
      return auth.response
    }

    // 2. Extract & validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const query = getThemeTrendsQuerySchema.parse(queryParams)

    // 3. Compute date window boundaries
    const periodDays = query.period === '7d' ? 7 : 30
    const now = new Date()
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const previousStart = new Date(
      now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000
    )

    // 4. Query current and previous period feedback counts at the database level
    const [themesCurrent, themesPrevious] = await Promise.all([
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
                  feedback: {
                    workspaceId: auth.user.workspaceId,
                    createdAt: {
                      gte: currentStart,
                      lte: now,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      query.compareToPrevious
        ? prisma.theme.findMany({
            where: {
              workspaceId: auth.user.workspaceId,
            },
            select: {
              id: true,
              _count: {
                select: {
                  feedback: {
                    where: {
                      feedback: {
                        workspaceId: auth.user.workspaceId,
                        createdAt: {
                          gte: previousStart,
                          lt: currentStart,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ])

    const previousCountMap = new Map<string, number>()
    for (const t of themesPrevious) {
      previousCountMap.set(t.id, t._count.feedback)
    }

    // 5. Compute trend metrics and spike status per theme
    const results = themesCurrent.map((t) => {
      const currentCount = t._count.feedback
      if (!query.compareToPrevious) {
        return {
          themeId: t.id,
          name: t.name,
          currentCount,
          previousCount: null,
          percentChange: null,
          isSpiking: false,
        }
      }

      const previousCount = previousCountMap.get(t.id) ?? 0
      let percentChange: number
      if (previousCount === 0) {
        percentChange = currentCount > 0 ? 100 : 0
      } else {
        percentChange =
          Math.round(((currentCount - previousCount) / previousCount) * 10000) /
          100
      }

      const isSpiking = percentChange > SPIKE_PERCENT_THRESHOLD

      return {
        themeId: t.id,
        name: t.name,
        currentCount,
        previousCount,
        percentChange,
        isSpiking,
      }
    })

    // 6. Sort descending by percentChange (handling nulls safely), then currentCount
    results.sort((a, b) => {
      if (a.percentChange !== null && b.percentChange !== null) {
        if (b.percentChange !== a.percentChange) {
          return b.percentChange - a.percentChange
        }
      } else if (a.percentChange !== null) {
        return -1
      } else if (b.percentChange !== null) {
        return 1
      }
      return b.currentCount - a.currentCount
    })

    return NextResponse.json({ data: results }, { status: 200 })
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

    console.error('Error fetching theme trends:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
