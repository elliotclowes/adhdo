'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, format, isAfter, isBefore, isEqual } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Check and update daily streak for a user
 * Called by cron job at midnight in user's timezone
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

  // Convert back to UTC for database queries
  const dayStartUTC = fromZonedTime(dayStart, userTimezone)
  const dayEndUTC = fromZonedTime(dayEnd, userTimezone)

  // Find all tasks scheduled for this day (that have both date AND time)
  const scheduledTasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
      parentId: null, // Only count parent tasks (sub-tasks are independent)
    },
    select: {
      id: true,
      isCompleted: true,
      scheduledDate: true,
    }
  })

  // Also count sub-tasks with scheduled dates independently
  const scheduledSubtasks = await prisma.todo.findMany({
    where: {
      userId: user.id,
      scheduledDate: {
        gte: dayStartUTC,
        lte: dayEndUTC,
      },
      parentId: { not: null }, // Only sub-tasks
    },
    select: {
      id: true,
      isCompleted: true,
      scheduledDate: true,
    }
  })

  const allScheduledTasks = [...scheduledTasks, ...scheduledSubtasks]

  // If no tasks scheduled, streak stays the same
  if (allScheduledTasks.length === 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastStreakCheckDate: checkDate }
    })
    return
  }

  // Check if ALL scheduled tasks were completed
  const allCompleted = allScheduledTasks.every(task => task.isCompleted)

  let newStreak = user.currentStreak
  let newLongestStreak = user.longestStreak

  if (allCompleted) {
    // Increment streak
    newStreak = user.currentStreak + 1
    // Update longest if needed
    if (newStreak > user.longestStreak) {
      newLongestStreak = newStreak
    }
  } else {
    // Reset streak
    newStreak = 0
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastStreakCheckDate: checkDate
    }
  })
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
