import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, Permission } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/reports/[id]
 * Retrieves a single Voice-of-Customer report by ID.
 * Enforces strict workspace isolation and returns 404 if the report does not exist
 * or belongs to another workspace.
 * Requires VIEW_REPORTS permission (ADMIN, ANALYST, VIEWER).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.VIEW_REPORTS)
    if (!auth.success) {
      return auth.response
    }

    const { id } = await context.params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // 2. Query report with strict workspace isolation
    const report = await prisma.report.findFirst({
      where: {
        id,
        workspaceId: auth.user.workspaceId,
      },
      include: {
        generator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(report, { status: 200 })
  } catch (err: unknown) {
    console.error('Error fetching report by ID:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
