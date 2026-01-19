import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TodayContent } from '@/components/today-content'
import type { TodoWithRelations } from '@/lib/types'

async function getTodayData(userId: string): Promise<{
  todayTodos: TodoWithRelations[]
  overdueTodos: TodoWithRelations[]
  user: { name: string | null; dailyTaskLimit: number; currentStreak: number } | null
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todayTodos, overdueTodos, user] = await Promise.all([
    prisma.todo.findMany({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        area: true,
        tags: { include: { tag: true } },
        children: {
          include: {
            children: true,
            tags: { include: { tag: true } },
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { scheduledDate: 'asc' }, { order: 'asc' }],
    }),
    prisma.todo.findMany({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        scheduledDate: {
          lt: today,
        },
      },
      include: {
        area: true,
        tags: { include: { tag: true } },
        children: {
          include: {
            children: true,
            tags: { include: { tag: true } },
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { priority: 'asc' }],
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, dailyTaskLimit: true, currentStreak: true },
    }),
  ])

  return {
    todayTodos: todayTodos as TodoWithRelations[],
    overdueTodos: overdueTodos as TodoWithRelations[],
    user
  }
}

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { todayTodos, overdueTodos, user } = await getTodayData(session.user.id)

  return (
    <TodayContent
      initialTodayTodos={todayTodos}
      initialOverdueTodos={overdueTodos}
      initialUser={user}
    />
  )
}
