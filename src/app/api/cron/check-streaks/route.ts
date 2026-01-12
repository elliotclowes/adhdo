import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkDailyStreak, checkRecurringStreaks } from '@/lib/actions/streaks'
import { subMinutes, addMinutes } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export async function GET(request: NextRequest) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    
    // Get all users whose local time is within 7 minutes of midnight
    // We check every 15 minutes, so this catches everyone
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        timezone: true,
        lastStreakCheckDate: true,
      }
    })

    const usersToProcess: { id: string; timezone: string }[] = []
    
    for (const user of allUsers) {
      try {
        // Convert current UTC time to user's timezone
        const userLocalTime = toZonedTime(now, user.timezone)
        const hours = userLocalTime.getHours()
        const minutes = userLocalTime.getMinutes()
        
        // Check if it's between 23:53 and 00:07 (midnight window)
        const isMidnightWindow = 
          (hours === 23 && minutes >= 53) || 
          (hours === 0 && minutes <= 7)
        
        if (isMidnightWindow) {
          // Check if we haven't already processed this user today
          const lastCheck = user.lastStreakCheckDate
          const today = userLocalTime.toDateString()
          const lastCheckDay = lastCheck ? toZonedTime(lastCheck, user.timezone).toDateString() : null
          
          if (lastCheckDay !== today) {
            usersToProcess.push({ 
              id: user.id, 
              timezone: user.timezone 
            })
          }
        }
      } catch (error) {
        console.error(`Error processing timezone for user ${user.id}:`, error)
        // Continue with next user
      }
    }

    // Process streaks for users in midnight window
    const results = []
    for (const user of usersToProcess) {
      try {
        // Get yesterday's date in user's timezone
        const userNow = toZonedTime(now, user.timezone)
        const yesterday = new Date(userNow)
        yesterday.setDate(yesterday.getDate() - 1)
        
        // Check daily streak for yesterday
        await checkDailyStreak(user.id, yesterday)
        
        // Check recurring task streaks for yesterday
        await checkRecurringStreaks(user.id, yesterday)
        
        results.push({ 
          userId: user.id, 
          timezone: user.timezone,
          status: 'processed' 
        })
      } catch (error) {
        console.error(`Error checking streaks for user ${user.id}:`, error)
        results.push({ 
          userId: user.id, 
          timezone: user.timezone,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
