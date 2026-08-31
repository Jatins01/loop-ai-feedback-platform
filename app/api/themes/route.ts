import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { requirePermission, Permission } from '@/lib/auth'
import {
  getThemesQuerySchema,
  createThemeSchema,
} from '@/lib/validations/theme'
import { ZodError } from 'zod'

/**
 * GET /api/themes
 * Retrieves all themes belonging to the authenticated user's workspace,
 * including the count of linked feedback records.
 * Supports ?includeEmpty=false to filter out themes with 0 feedback.
 * Requires VIEW_THEMES permission.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.VIEW_THEMES)
    if (!auth.success) {
      return auth.response
    }

    // 2. Extract & validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const query = getThemesQuerySchema.parse(queryParams)

    // 3. Build Prisma query strictly scoped to workspace
    const where: Prisma.ThemeWhereInput = {
      workspaceId: auth.user.workspaceId,
    }

    if (!query.includeEmpty) {
      where.feedback = {
        some: {},
      }
    }

    // 4. Query database with relation count
    const themes = await prisma.theme.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            feedback: true,
          },
        },
      },
    })

    // 5. Format response with feedbackCount
    const data = themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      feedbackCount: theme._count.feedback,
    }))

    return NextResponse.json({ data }, { status: 200 })
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

    console.error('Error fetching themes:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/themes
 * Creates a new theme in the authenticated user's workspace.
 * Requires MANAGE_THEMES permission (ADMIN or ANALYST).
 * Returns 409 Conflict if a theme with the same name already exists in this workspace.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.MANAGE_THEMES)
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
    const validated = createThemeSchema.parse(rawBody)

    // 4. Check for duplicate theme name in the SAME workspace
    const existingTheme = await prisma.theme.findFirst({
      where: {
        workspaceId: auth.user.workspaceId,
        name: {
          equals: validated.name,
          mode: 'insensitive',
        },
      },
    })

    if (existingTheme) {
      return NextResponse.json(
        { error: 'A theme with this name already exists in this workspace.' },
        { status: 409 }
      )
    }

    // 5. Create theme with workspaceId strictly from session
    const createdTheme = await prisma.theme.create({
      data: {
        name: validated.name,
        description: validated.description ?? null,
        color: validated.color ?? null,
        workspaceId: auth.user.workspaceId,
      },
    })

    return NextResponse.json(
      {
        id: createdTheme.id,
        name: createdTheme.name,
        description: createdTheme.description,
        color: createdTheme.color,
        workspaceId: createdTheme.workspaceId,
        feedbackCount: 0,
      },
      { status: 201 }
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

    // Handle potential Prisma unique constraint race conditions
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A theme with this name already exists in this workspace.' },
        { status: 409 }
      )
    }

    console.error('Error creating theme:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
