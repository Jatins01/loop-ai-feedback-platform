import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { requirePermission, Permission } from '@/lib/auth'
import {
  createFeedbackSchema,
  getFeedbackQuerySchema,
} from '@/lib/validations/feedback'
import { ZodError } from 'zod'

/**
 * POST /api/feedback
 * Creates a new feedback entry for the authenticated user's workspace.
 * Requires CREATE_FEEDBACK permission.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.CREATE_FEEDBACK)
    if (!auth.success) {
      return auth.response
    }

    // 2. Parse request JSON body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // 3. Validate with Zod
    const validated = createFeedbackSchema.parse(rawBody)

    // 4. Create Feedback with workspaceId strictly from session
    const feedback = await prisma.feedback.create({
      data: {
        content: validated.content,
        channel: validated.channel,
        sourceRef: validated.sourceRef ?? null,
        customerLabel: validated.customerLabel ?? null,
        sentiment: validated.sentiment ?? null,
        sentimentScore: validated.sentimentScore ?? null,
        status: validated.status ?? 'NEW',
        workspaceId: auth.user.workspaceId,
      },
    })

    return NextResponse.json(feedback, { status: 201 })
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

    console.error('Error creating feedback:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback
 * Returns paginated, filtered feedback entries for the authenticated user's workspace.
 * Requires VIEW_FEEDBACK permission.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.VIEW_FEEDBACK)
    if (!auth.success) {
      return auth.response
    }

    // 2. Extract & validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    const query = getFeedbackQuerySchema.parse(queryParams)

    // 3. Build Prisma where clause with MANDATORY workspace isolation
    const where: Prisma.FeedbackWhereInput = {
      workspaceId: auth.user.workspaceId,
    }

    if (query.channel) {
      where.channel = query.channel
    }

    if (query.sentiment) {
      where.sentiment = query.sentiment
    }

    if (query.status) {
      where.status = query.status
    }

    // Date range filtering on createdAt
    const fromDate = query.dateFrom ?? query.from
    const toDate = query.dateTo ?? query.to
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) {
        where.createdAt.gte = fromDate
      }
      if (toDate) {
        where.createdAt.lte = toDate
      }
    }

    // Search query on content (case-insensitive)
    const searchTerm = query.q ?? query.search
    if (searchTerm) {
      where.content = {
        contains: searchTerm,
        mode: 'insensitive',
      }
    }

    // Theme filtering: strictly verify that the theme belongs to auth.user.workspaceId
    const targetThemeId = query.themeId ?? query.theme
    if (targetThemeId) {
      where.themes = {
        some: {
          themeId: targetThemeId,
          theme: {
            workspaceId: auth.user.workspaceId,
          },
        },
      }
    }

    // 4. Pagination calculations (default pageSize = 25, max = 100)
    const page = query.page
    const pageSize = query.pageSize ?? query.limit ?? 25
    const skip = (page - 1) * pageSize
    const take = pageSize

    // 5. Query data and total count concurrently
    const [data, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        include: {
          themes: {
            include: {
              theme: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      prisma.feedback.count({ where }),
    ])

    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages,
        limit: pageSize,
        total,
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

    console.error('Error fetching feedback:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
