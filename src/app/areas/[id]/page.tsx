import { redirect, notFound } from 'next/navigation'
import { FolderOpen, Calendar, Clock } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getAreaWithTodos } from '@/lib/actions/areas'
import { TaskCard } from '@/components/task-card'
import type { TodoWithRelations } from '@/lib/types'

interface AreaPageProps {
  params: { id: string }
}

export default async function AreaPage({ params }: AreaPageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  let area
  try {
    area = await getAreaWithTodos(params.id)
  } catch {
    notFound()
  }

  // Split into planned (has date/time/duration) and non-planned
  const plannedTodos = area.todos.filter(
    (t) => t.scheduledDate && t.duration
  )
  const nonPlannedTodos = area.todos.filter(
    (t) => !t.scheduledDate || !t.duration
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${area.color}20` }}
          >
            <FolderOpen
              className="w-6 h-6"
              style={{ color: area.color }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {area.name}
            </h1>
            <p className="text-muted-foreground">
              {area.todos.length} {area.todos.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
      </div>

      {/* Planned Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Planned
          <span className="text-sm font-normal text-muted-foreground">
            (scheduled with time blocked)
          </span>
        </h2>
        {plannedTodos.length > 0 ? (
          <div className="space-y-3">
            {plannedTodos.map((todo) => (
              <TaskCard
                key={todo.id}
                todo={todo as TodoWithRelations}
                showArea={false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No planned tasks. Add a date, time, and duration to plan tasks.
            </p>
          </div>
        )}
      </section>

      {/* Non-Planned Section */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Not Planned
          <span className="text-sm font-normal text-muted-foreground">
            (needs scheduling)
          </span>
        </h2>
        {nonPlannedTodos.length > 0 ? (
          <div className="space-y-3">
            {nonPlannedTodos.map((todo) => (
              <TaskCard
                key={todo.id}
                todo={todo as TodoWithRelations}
                showArea={false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              All tasks in this area are planned!
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
