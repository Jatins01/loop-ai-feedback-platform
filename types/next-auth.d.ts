import { DefaultSession } from 'next-auth'
import { Role } from '@/generated/prisma/enums'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      workspaceId: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: Role
    workspaceId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role
    workspaceId?: string
  }
}
