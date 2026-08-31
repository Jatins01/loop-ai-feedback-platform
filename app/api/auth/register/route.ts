import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z, ZodError } from 'zod'

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    workspaceName: z.string().trim().min(1, 'Workspace name is required').max(100),
  })
  .strict()

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = registerSchema.parse(rawBody)

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(validated.password, 10)

    // Create workspace and admin user
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: validated.workspaceName,
        },
      })

      const user = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email,
          passwordHash,
          role: 'ADMIN',
          workspaceId: workspace.id,
        },
      })

      return { user, workspace }
    })

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          workspaceId: result.workspace.id,
          workspaceName: result.workspace.name,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      )
    }

    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
