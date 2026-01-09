import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TaskCard } from '@/components/task-card'
import { getGreeting } from '@/lib/utils'
import type { TodoWithRelations } from '@/lib/types'

async function getTodayData(userId: string): Promise<{
  todayTodos: TodoWithRelations[]
  overdueTodos: TodoWithRelations[]
  user: { name: string | null; dailyTaskLimit: number } | null
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
      select: { name: true, dailyTaskLimit: true },
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
  const greeting = getGreeting()
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting}, {firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-3xl font-bold text-primary">{todayTodos.length}</p>
          <p className="text-sm text-muted-foreground">Tasks today</p>
          {user?.dailyTaskLimit && (
            <p className="text-xs text-muted-foreground mt-1">
              Limit: {user.dailyTaskLimit}
            </p>
          )}
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-3xl font-bold text-amber-500">{overdueTodos.length}</p>
          <p className="text-sm text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Overdue Section */}
      {overdueTodos.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Overdue
          </h2>
          <div className="space-y-3">
            {overdueTodos.map((todo) => (
              <TaskCard key={todo.id} todo={todo as TodoWithRelations} />
            ))}
          </div>
        </section>
      )}

      {/* Today Section */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Today
        </h2>
        {todayTodos.length > 0 ? (
          <div className="space-y-3">
            {todayTodos.map((todo) => (
              <TaskCard key={todo.id} todo={todo as TodoWithRelations} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border">
            <p className="text-muted-foreground">No tasks scheduled for today</p>
            <p className="text-sm text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Q</kbd> to add one
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
