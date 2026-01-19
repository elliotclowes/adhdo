'use client'

import { Calendar, Clock } from 'lucide-react'
import { useArea } from '@/hooks/use-area'
import { TaskCard } from '@/components/task-card'
import { AreaHeader } from '@/components/area-header'
import type { TodoWithRelations, Area } from '@/lib/types'

type AreaWithTodos = Area & {
  todos: TodoWithRelations[]
}

interface AreaContentProps {
  initialArea: AreaWithTodos
}

export function AreaContent({ initialArea }: AreaContentProps) {
  // Use SWR for real-time updates
  const { area } = useArea(initialArea.id, initialArea)

  // Use the area from SWR (with fallback to initial)
  const currentArea = area ?? initialArea

  // Split into planned (has date/time/duration) and non-planned
  const plannedTodos: TodoWithRelations[] = currentArea.todos.filter(
    (t: TodoWithRelations) => t.scheduledDate && t.duration
  )
  const nonPlannedTodos: TodoWithRelations[] = currentArea.todos.filter(
    (t: TodoWithRelations) => !t.scheduledDate || !t.duration
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header with edit capability */}
      <AreaHeader
        area={{
          id: currentArea.id,
          name: currentArea.name,
          color: currentArea.color,
          icon: currentArea.icon,
          requiresScheduling: currentArea.requiresScheduling,
        }}
        taskCount={currentArea.todos.length}
      />

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
            {currentArea.requiresScheduling ? '(needs scheduling)' : '(no scheduling required)'}
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
