'use client'

import { format } from 'date-fns'
import { useTodayTodos, useOverdueTodos, useUser } from '@/hooks'
import { TaskCard } from '@/components/task-card'
import { getGreeting } from '@/lib/utils'
import type { TodoWithRelations } from '@/lib/types'

interface TodayContentProps {
  initialTodayTodos: TodoWithRelations[]
  initialOverdueTodos: TodoWithRelations[]
  initialUser: {
    name: string | null
    dailyTaskLimit: number
    currentStreak: number
  } | null
}

export function TodayContent({
  initialTodayTodos,
  initialOverdueTodos,
  initialUser,
}: TodayContentProps) {
  // Use SWR for real-time updates
  const { todos: todayTodos } = useTodayTodos(initialTodayTodos)
  const { todos: overdueTodos } = useOverdueTodos(initialOverdueTodos)
  const { user } = useUser({
    fallbackData: initialUser ? {
      id: '',
      name: initialUser.name,
      email: null,
      dailyTaskLimit: initialUser.dailyTaskLimit,
      vitalTaskLimit: null,
      importantTaskLimit: null,
      notImportantTaskLimit: null,
      somedayTaskLimit: null,
      dailySummaryTime: '07:00',
      timezone: 'Europe/London',
      currentStreak: initialUser.currentStreak,
      longestStreak: 0,
    } : undefined,
  })

  const greeting = getGreeting()
  const firstName = user?.name?.split(' ')[0] || initialUser?.name?.split(' ')[0] || 'there'
  const dailyTaskLimit = user?.dailyTaskLimit ?? initialUser?.dailyTaskLimit
  const currentStreak = user?.currentStreak ?? initialUser?.currentStreak ?? 0

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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-3xl font-bold text-primary">{todayTodos.length}</p>
          <p className="text-sm text-muted-foreground">Tasks today</p>
          {dailyTaskLimit && (
            <p className="text-xs text-muted-foreground mt-1">
              Limit: {dailyTaskLimit}
            </p>
          )}
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-3xl font-bold text-amber-500">{overdueTodos.length}</p>
          <p className="text-sm text-muted-foreground">Overdue</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-3xl font-bold text-orange-500 flex items-center gap-2">
            🔥 {currentStreak}
          </p>
          <p className="text-sm text-muted-foreground">Day streak</p>
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
