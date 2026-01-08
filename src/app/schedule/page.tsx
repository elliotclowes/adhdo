import { redirect } from 'next/navigation'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ScheduleClient } from '@/components/schedule-client'
import type { TodoWithRelations } from '@/lib/types'

async function getScheduleData(userId: string) {
  // Get todos for the next 2 weeks to cover all views
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = addDays(start, 21) // 3 weeks ahead

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      scheduledDate: {
        gte: start,
        lte: end,
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
  })

  // Group by date
  const grouped: Record<string, TodoWithRelations[]> = {}
  todos.forEach((todo) => {
    if (todo.scheduledDate) {
      const key = format(todo.scheduledDate, 'yyyy-MM-dd')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(todo as TodoWithRelations)
    }
  })

  return grouped
}

export default async function SchedulePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const todos = await getScheduleData(session.user.id)

  return (
    <ScheduleClient
      initialTodos={todos}
      initialDate={new Date().toISOString()}
    />
  )
}
