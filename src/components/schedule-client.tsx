'use client'

import { useState, useEffect, useTransition } from 'react'
import { format, addDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/task-card'
import { cn } from '@/lib/utils'
import type { TodoWithRelations } from '@/lib/types'

type ViewType = 'today' | '3days' | 'week'

interface ScheduleClientProps {
  initialTodos: Record<string, TodoWithRelations[]>
  initialDate: string
}

export function ScheduleClient({ initialTodos, initialDate }: ScheduleClientProps) {
  const [view, setView] = useState<ViewType>('today')
  const [currentDate, setCurrentDate] = useState(new Date(initialDate))
  const [todos, setTodos] = useState(initialTodos)
  const [isPending, startTransition] = useTransition()

  const getDaysToShow = () => {
    const start = startOfDay(currentDate)
    
    switch (view) {
      case 'today':
        return [start]
      case '3days':
        return [start, addDays(start, 1), addDays(start, 2)]
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(start, { weekStartsOn: 1 }),
          end: endOfWeek(start, { weekStartsOn: 1 }),
        })
    }
  }

  const days = getDaysToShow()

  const navigatePrev = () => {
    const offset = view === 'today' ? 1 : view === '3days' ? 3 : 7
    setCurrentDate((prev) => addDays(prev, -offset))
  }

  const navigateNext = () => {
    const offset = view === 'today' ? 1 : view === '3days' ? 3 : 7
    setCurrentDate((prev) => addDays(prev, offset))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDayKey = (date: Date) => format(date, 'yyyy-MM-dd')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {format(currentDate, 'MMMM yyyy')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['today', '3days', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  view === v
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'today' ? 'Today' : v === '3days' ? '3 Days' : 'Week'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="icon" onClick={navigatePrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={goToToday}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={navigateNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        'grid gap-4',
        view === 'today' ? 'grid-cols-1' : view === '3days' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-7'
      )}>
        {days.map((day) => {
          const dayKey = formatDayKey(day)
          const dayTodos = todos[dayKey] || []
          const isToday = formatDayKey(day) === formatDayKey(new Date())
          const isPast = day < startOfDay(new Date())

          return (
            <div
              key={dayKey}
              className={cn(
                'bg-card rounded-xl border p-4 min-h-[200px]',
                isToday && 'ring-2 ring-primary',
                isPast && 'opacity-60'
              )}
            >
              {/* Day Header */}
              <div className="mb-3 pb-2 border-b">
                <p className={cn(
                  'text-sm font-medium',
                  isToday ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {format(day, 'EEEE')}
                </p>
                <p className={cn(
                  'text-2xl font-semibold',
                  isToday ? 'text-primary' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {dayTodos.length > 0 ? (
                  dayTodos.map((todo) => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      compact
                      showArea={false}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
