import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const workspace = await prisma.workspace.create({
    data: { name: 'Demo Company' },
  })

  const passwordHash = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      { name: 'Admin User', email: 'admin@demo.com', passwordHash, role: 'ADMIN', workspaceId: workspace.id },
      { name: 'Analyst User', email: 'analyst@demo.com', passwordHash, role: 'ANALYST', workspaceId: workspace.id },
      { name: 'Viewer User', email: 'viewer@demo.com', passwordHash, role: 'VIEWER', workspaceId: workspace.id },
    ],
  })

  const channels = ['support_ticket', 'app_review', 'nps_survey', 'sales_note', 'community_post']
  const samples = [
    'Onboarding took forever, could not figure out how to invite my team.',
    'The new dashboard is gorgeous and finally fast.',
    'It does the job, but the mobile experience needs work.',
    'Prospect wants SSO before they will sign.',
    'Love the new export feature, saved me an hour today.',
  ]

  for (let i = 0; i < 120; i++) {
    await prisma.feedback.create({
      data: {
        content: samples[i % samples.length],
        channel: channels[i % channels.length],
        workspaceId: workspace.id,
      },
    })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())