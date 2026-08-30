import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, Permission } from '@/lib/auth'
import { classifyFeedback } from '@/lib/ai'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/feedback/[id]/reclassify
 * Manually triggers AI reclassification for an existing feedback item.
 * Requires UPDATE_FEEDBACK permission (ADMIN or ANALYST).
 * Atomic transaction replaces old FeedbackTheme links only upon successful classification.
 */
export async function POST(req: NextRequest, context: RouteContext) {
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

    // 2. Find feedback strictly within user's workspace
    const feedback = await prisma.feedback.findUnique({
      where: {
        id,
        workspaceId: auth.user.workspaceId,
      },
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // 3. Fetch workspace existing theme names
    const existingThemes = await prisma.theme.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: { name: true },
    })
    const themeNames = existingThemes.map((t) => t.name)

    // 4. Call Claude AI classification
    const classification = await classifyFeedback(
      feedback.content,
      themeNames
    )

    if (!classification) {
      // Do not destroy existing classification if AI call fails
      return NextResponse.json(
        { error: 'AI classification failed. Existing classification retained.' },
        { status: 500 }
      )
    }

    // 5. Atomic transaction to update feedback and replace theme links
    const updated = await prisma.$transaction(async (tx) => {
      // Update sentiment & score
      await tx.feedback.update({
        where: { id: feedback.id, workspaceId: auth.user.workspaceId },
        data: {
          sentiment: classification.sentiment,
          sentimentScore: classification.sentimentScore,
        },
      })

      // Remove previous FeedbackTheme links
      await tx.feedbackTheme.deleteMany({
        where: { feedbackId: feedback.id },
      })

      // Create new theme links
      for (const rawName of classification.themes) {
        const themeName = rawName.trim()
        if (!themeName) continue

        let theme = await tx.theme.findFirst({
          where: {
            workspaceId: auth.user.workspaceId,
            name: {
              equals: themeName,
              mode: 'insensitive',
            },
          },
        })

        if (!theme) {
          theme = await tx.theme.create({
            data: {
              name: themeName,
              workspaceId: auth.user.workspaceId,
            },
          })
        }

        await tx.feedbackTheme.create({
          data: {
            feedbackId: feedback.id,
            themeId: theme.id,
            confidence: 1.0,
          },
        })
      }

      return await tx.feedback.findUnique({
        where: { id: feedback.id },
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
      })
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (err: unknown) {
    console.error('Error reclassifying feedback:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
