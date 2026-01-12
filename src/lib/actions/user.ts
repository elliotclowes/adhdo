'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { UserPreferences } from '@/lib/types'

export async function getUserSettings() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyTaskLimit: true,
      vitalTaskLimit: true,
      importantTaskLimit: true,
      notImportantTaskLimit: true,
      somedayTaskLimit: true,
      dailySummaryTime: true,
      timezone: true,
      currentStreak: true,
      longestStreak: true,
    },
  })

  return user
}

export async function updateUserSettings(settings: Partial<UserPreferences>) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(settings.dailyTaskLimit !== undefined && { dailyTaskLimit: settings.dailyTaskLimit }),
      ...(settings.vitalTaskLimit !== undefined && { vitalTaskLimit: settings.vitalTaskLimit }),
      ...(settings.importantTaskLimit !== undefined && { importantTaskLimit: settings.importantTaskLimit }),
      ...(settings.notImportantTaskLimit !== undefined && { notImportantTaskLimit: settings.notImportantTaskLimit }),
      ...(settings.somedayTaskLimit !== undefined && { somedayTaskLimit: settings.somedayTaskLimit }),
      ...(settings.dailySummaryTime !== undefined && { dailySummaryTime: settings.dailySummaryTime }),
      ...(settings.timezone !== undefined && { timezone: settings.timezone }),
    },
    select: {
      dailyTaskLimit: true,
      vitalTaskLimit: true,
      importantTaskLimit: true,
      notImportantTaskLimit: true,
      somedayTaskLimit: true,
      dailySummaryTime: true,
      timezone: true,
    },
  })

  revalidatePath('/settings')

  return user
}

export async function getUserStats() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const [
    totalTodos,
    completedToday,
    completedYesterday,
    addedYesterday,
    overdueCount,
    todayCount,
  ] = await Promise.all([
    prisma.todo.count({
      where: { userId, isCompleted: false },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: true,
        completedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: true,
        completedAt: { gte: yesterday, lt: today },
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        createdAt: { gte: yesterday, lt: today },
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        scheduledDate: { lt: today },
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        scheduledDate: { gte: today, lt: tomorrow },
      },
    }),
  ])

  return {
    totalTodos,
    completedToday,
    completedYesterday,
    addedYesterday,
    overdueCount,
    todayCount,
  }
}
