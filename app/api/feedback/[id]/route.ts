import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, Permission } from '@/lib/auth'
import {
  updateFeedbackStatusSchema,
  isValidStatusTransition,
} from '@/lib/validations/feedback'
import { ZodError } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/feedback/[id]
 * Updates feedback status with strict state-transition enforcement and tenant scoping.
 * Requires UPDATE_FEEDBACK permission.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.UPDATE_FEEDBACK)
    if (!auth.success) {
      return auth.response
    }

    const { id } = await context.params
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid feedback ID' },
        { status: 400 }
      )
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

    // 3. Validate with Zod (strictly status only)
    const validated = updateFeedbackStatusSchema.parse(rawBody)

    // 4. Find feedback strictly within user's workspace
    const existing = await prisma.feedback.findUnique({
      where: {
        id,
        workspaceId: auth.user.workspaceId,
      },
    })

    if (!existing) {
      // Safe 404: Never reveals whether ID exists in another workspace
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // 5. Enforce allowed status transitions
    if (!isValidStatusTransition(existing.status, validated.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${existing.status}' to '${validated.status}'. Allowed transitions: NEW -> REVIEWED, REVIEWED -> ACTIONED.`,
        },
        { status: 400 }
      )
    }

    // 6. Perform atomic tenant-scoped update
    const updated = await prisma.feedback.update({
      where: {
        id: existing.id,
        workspaceId: auth.user.workspaceId,
      },
      data: {
        status: validated.status,
      },
    })

    return NextResponse.json(updated, { status: 200 })
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

    console.error('Error updating feedback status:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
