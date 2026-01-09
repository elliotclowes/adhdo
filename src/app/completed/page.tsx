import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CompletedTaskCard } from '@/components/completed-task-card'

type CompletedTodo = {
  id: string
  title: string
  description: string | null
  priority: number
  completedAt: Date | null
  area: { id: string; name: string; color: string } | null
  tags: { tag: { id: string; name: string; color: string } }[]
  parent: { id: string; title: string } | null
}

async function getCompletedTodos(userId: string) {
  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: true,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      parent: true, // Include parent info for sub-tasks
    },
    orderBy: { completedAt: 'desc' },
    take: 50,
  }) as CompletedTodo[]

  // Group by completion date
  const grouped: Record<string, CompletedTodo[]> = {}
  todos.forEach((todo: CompletedTodo) => {
    if (todo.completedAt) {
      const key = format(todo.completedAt, 'yyyy-MM-dd')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(todo)
    }
  })

  return grouped
}

export default async function CompletedPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const groupedTodos = await getCompletedTodos(session.user.id)
  const dates = Object.keys(groupedTodos).sort().reverse()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          Completed
        </h1>
        <p className="text-muted-foreground mt-1">
          Your accomplishments, organized by date
        </p>
      </div>

      {/* Completed Tasks by Date */}
      {dates.length > 0 ? (
        <div className="space-y-8">
          {dates.map((date) => {
            const todos = groupedTodos[date]
            const dateObj = new Date(date)
            const isToday = format(new Date(), 'yyyy-MM-dd') === date
            const isYesterday =
              format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === date

            return (
              <section key={date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                  {isToday
                    ? 'Today'
                    : isYesterday
                    ? 'Yesterday'
                    : format(dateObj, 'EEEE, MMMM d')}
                  <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                    {todos.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <CompletedTaskCard key={todo.id} todo={todo} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No completed tasks yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete some tasks to see them here!
          </p>
        </div>
      )}
    </div>
  )
}
