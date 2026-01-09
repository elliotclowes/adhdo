import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendDailySummary } from '@/lib/email'

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic'

// This endpoint is called by Vercel Cron
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/daily-summary", "schedule": "0 * * * *" }] }
// Runs every hour and checks which users should receive their summary based on their preferred time

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const currentHour = new Date().getHours().toString().padStart(2, '0')
    const currentMinute = '00' // We run at the top of each hour

    // Find users whose daily summary time matches current hour
    const users = await prisma.user.findMany({
      where: {
        dailySummaryTime: {
          startsWith: `${currentHour}:`,
        },
        email: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // Send summaries
    const results = await Promise.allSettled(
      users.map((user: { id: string; email: string | null }) => sendDailySummary(user.id))
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      message: `Sent ${succeeded} daily summaries, ${failed} failed`,
      processed: users.length,
    })
  } catch (error) {
    console.error('Daily summary cron error:', error)
    return NextResponse.json(
      { error: 'Failed to send daily summaries' },
      { status: 500 }
    )
  }
}
