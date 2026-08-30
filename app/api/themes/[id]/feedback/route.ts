import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { requireAuth } from '@/lib/auth'
import { getThemeFeedbackQuerySchema } from '@/lib/validations/theme'
import { ZodError } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/themes/[id]/feedback
 * Returns paginated feedback records linked to a specific workspace theme.
 * Enforces strict multi-tenant isolation and returns 404 if theme is not found in user workspace.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // 1. Enforce authentication
    const auth = await requireAuth()
    if (!auth.success) {
      return auth.response
    }

    const { id } = await context.params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    // 2. Validate that the theme exists strictly within the authenticated workspace
    const theme = await prisma.theme.findUnique({
      where: {
        id,
        workspaceId: auth.user.workspaceId,
      },
    })

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    // 3. Extract & validate pagination query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const query = getThemeFeedbackQuerySchema.parse(queryParams)

    const page = query.page
    const pageSize = query.pageSize ?? query.limit ?? 25
    const skip = (page - 1) * pageSize
    const take = pageSize

    // 4. Construct where clause ensuring workspace isolation & theme linkage
    const where: Prisma.FeedbackWhereInput = {
      workspaceId: auth.user.workspaceId,
      themes: {
        some: {
          themeId: theme.id,
          theme: {
            workspaceId: auth.user.workspaceId,
          },
        },
      },
    }

    // 5. Query feedback data and count concurrently
    const [data, totalItems] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
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

    const totalPages = Math.ceil(totalItems / pageSize)

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
      { status: 200 }
    )
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

    console.error('Error fetching theme feedback:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
