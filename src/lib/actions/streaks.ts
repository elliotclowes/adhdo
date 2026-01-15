'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, format, isAfter, isBefore, isEqual } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Check and update daily streak for a user
 * Called by cron job at midnight in user's timezone
 *
 * With immediate streak updates, this function now primarily:
 * 1. Resets streaks when users miss days (didn't complete all tasks)
 * 2. Acts as a fallback if immediate update didn't fire
 */
export async function checkDailyStreak(userId: string, checkDate: Date) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      timezone: true,
      currentStreak: true,
      longestStreak: true,
      lastStreakCheckDate: true
    }
  })

  if (!user) return

  // Convert checkDate to user's timezone
  const userTimezone = user.timezone
  const dateInUserTz = toZonedTime(checkDate, userTimezone)
  const dayStart = startOfDay(dateInUserTz)
  const dayEnd = endOfDay(dateInUserTz)
  const checkDateStr = format(dateInUserTz, 'yyyy-MM-dd')

  // Convert back to UTC for database queries
  const dayStartUTC = fromZonedTime(dayStart, userTimezone)
  const dayEndUTC = fromZonedTime(dayEnd, userTimezone)

  // Check if user already got credit for this date (via immediate sync)
  let lastCreditedDateStr: string | null = null
  if (user.lastStreakCheckDate) {
    const lastCheckInUserTz = toZonedTime(user.lastStreakCheckDate, userTimezone)
    lastCreditedDateStr = format(lastCheckInUserTz, 'yyyy-MM-dd')
  }

  // If already processed this date, skip
  if (lastCreditedDateStr === checkDateStr) {
    return
  }

  // Find all tasks scheduled for this day
  const scheduledTasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
      parentId: null,
    },
    select: {
      id: true,
      isCompleted: true,
    }
  })

  const scheduledSubtasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
      parentId: { not: null },
    },
    select: {
      id: true,
      isCompleted: true,
    }
  })

  const allScheduledTasks = [...scheduledTasks, ...scheduledSubtasks]

  // If no tasks scheduled, just update the check date
  if (allScheduledTasks.length === 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastStreakCheckDate: checkDate }
    })
    return
  }

  const allCompleted = allScheduledTasks.every(task => task.isCompleted)

  if (allCompleted) {
    // All complete - increment streak (fallback if immediate sync missed it)
    const newStreak = user.currentStreak + 1
    const newLongestStreak = Math.max(newStreak, user.longestStreak)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakCheckDate: checkDate
      }
    })
  } else {
    // Not all complete - reset streak
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: 0,
        lastStreakCheckDate: checkDate
      }
    })
  }
}

/**
 * Check and update recurring task streaks
 * Called by cron job at midnight to check for missed recurring tasks
 */
export async function checkRecurringStreaks(userId: string, checkDate: Date) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timezone: true }
  })

  if (!user) return

  // Convert checkDate to user's timezone
  const userTimezone = user.timezone
  const dateInUserTz = toZonedTime(checkDate, userTimezone)
  const dayStart = startOfDay(dateInUserTz)
  const dayEnd = endOfDay(dateInUserTz)

  // Convert back to UTC for database queries
  const dayStartUTC = fromZonedTime(dayStart, userTimezone)
  const dayEndUTC = fromZonedTime(dayEnd, userTimezone)

  // Find all recurring tasks that were due on this day but NOT completed
  const missedRecurringTasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      isRecurring: true,
      scheduledDate: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
      isCompleted: false,
    },
  })

  // Reset streaks for missed recurring tasks
  for (const task of missedRecurringTasks) {
    await prisma.todo.update({
      where: { id: task.id },
      data: {
        recurringStreak: 0,
      }
    })
  }
}

/**
 * Update recurring task streak when completed
 * Called when a recurring task is marked as complete
 */
export async function updateRecurringStreak(todoId: string) {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    select: {
      id: true,
      isRecurring: true,
      scheduledDate: true,
      completedAt: true,
      recurringStreak: true,
      longestRecurringStreak: true,
      user: {
        select: { timezone: true }
      }
    }
  })

  if (!todo || !todo.isRecurring || !todo.scheduledDate || !todo.completedAt) {
    return
  }

  // Convert both dates to user's timezone for comparison
  const userTimezone = todo.user.timezone
  const scheduledDateInTz = toZonedTime(todo.scheduledDate, userTimezone)
  const completedDateInTz = toZonedTime(todo.completedAt, userTimezone)

  // Check if completed on the same day as scheduled (in user's timezone)
  const scheduledDay = format(scheduledDateInTz, 'yyyy-MM-dd')
  const completedDay = format(completedDateInTz, 'yyyy-MM-dd')

  if (scheduledDay === completedDay) {
    // Increment streak
    const newStreak = todo.recurringStreak + 1
    const newLongestStreak = Math.max(newStreak, todo.longestRecurringStreak)

    await prisma.todo.update({
      where: { id: todo.id },
      data: {
        recurringStreak: newStreak,
        longestRecurringStreak: newLongestStreak,
        lastRecurringCompletionDate: todo.completedAt,
      }
    })
  }
  // If not completed on the due date, don't change streak
  // (it will be reset to 0 by the midnight check if it remains incomplete)
}

/**
 * Get user's current streak data
 */
export async function getUserStreak() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      currentStreak: true,
      longestStreak: true,
    }
  })

  return user
}

/**
 * Sync daily streak based on current task completion status
 * Called immediately when tasks are completed, uncompleted, or added
 *
 * Logic:
 * - If all tasks for today are complete AND we haven't credited today yet → +1 streak
 * - If not all tasks are complete AND we had credited today → -1 streak
 */
export async function syncDailyStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      timezone: true,
      currentStreak: true,
      longestStreak: true,
      lastStreakCheckDate: true,
    }
  })

  if (!user) return

  const userTimezone = user.timezone
  const now = new Date()
  const nowInUserTz = toZonedTime(now, userTimezone)
  const todayStart = startOfDay(nowInUserTz)
  const todayEnd = endOfDay(nowInUserTz)

  // Convert to UTC for database queries
  const todayStartUTC = fromZonedTime(todayStart, userTimezone)
  const todayEndUTC = fromZonedTime(todayEnd, userTimezone)

  // Get today's date string for comparison
  const todayDateStr = format(nowInUserTz, 'yyyy-MM-dd')

  // Check what date we last credited (if any)
  let lastCreditedDateStr: string | null = null
  if (user.lastStreakCheckDate) {
    const lastCheckInUserTz = toZonedTime(user.lastStreakCheckDate, userTimezone)
    lastCreditedDateStr = format(lastCheckInUserTz, 'yyyy-MM-dd')
  }

  const alreadyCreditedToday = lastCreditedDateStr === todayDateStr

  // Get all scheduled tasks for today (parent tasks only, plus sub-tasks with their own dates)
  const scheduledTasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: todayStartUTC,
        lte: todayEndUTC,
      },
      parentId: null,
    },
    select: {
      id: true,
      isCompleted: true,
    }
  })

  const scheduledSubtasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: todayStartUTC,
        lte: todayEndUTC,
      },
      parentId: { not: null },
    },
    select: {
      id: true,
      isCompleted: true,
    }
  })

  const allScheduledTasks = [...scheduledTasks, ...scheduledSubtasks]

  // If no tasks scheduled for today, don't change anything
  if (allScheduledTasks.length === 0) {
    return
  }

  const allComplete = allScheduledTasks.every(task => task.isCompleted)

  if (allComplete && !alreadyCreditedToday) {
    // All tasks complete and we haven't credited today → +1 streak
    const newStreak = user.currentStreak + 1
    const newLongestStreak = Math.max(newStreak, user.longestStreak)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakCheckDate: now, // Mark today as credited
      }
    })
  } else if (!allComplete && alreadyCreditedToday) {
    // Not all complete but we had credited today → -1 streak (revert)
    const newStreak = Math.max(0, user.currentStreak - 1)

    // Calculate yesterday's date for lastStreakCheckDate
    const yesterdayInUserTz = new Date(nowInUserTz)
    yesterdayInUserTz.setDate(yesterdayInUserTz.getDate() - 1)
    const yesterdayUTC = fromZonedTime(yesterdayInUserTz, userTimezone)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: newStreak,
        lastStreakCheckDate: yesterdayUTC, // Revert to yesterday
      }
    })
    // Note: We don't decrement longestStreak - it's a high-water mark
  }
  // If allComplete && alreadyCreditedToday → no change needed
  // If !allComplete && !alreadyCreditedToday → no change needed
}
