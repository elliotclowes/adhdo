'use client'

import { useState } from 'react'
import { format, addDays, startOfDay, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, List, CalendarDays as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/task-card'
import { useAppStore } from '@/lib/store'
import { useSchedule } from '@/hooks'
import { cn } from '@/lib/utils'
import type { TodoWithRelations } from '@/lib/types'

type ViewType = 'today' | '3days' | 'week'
type DisplayMode = 'list' | 'calendar'

interface ScheduleClientProps {
  initialTodos: Record<string, TodoWithRelations[]>
  initialDate: string
}

// Hours to display in calendar view (6am to 11pm)
const CALENDAR_HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

export function ScheduleClient({ initialTodos, initialDate }: ScheduleClientProps) {
  const [view, setView] = useState<ViewType>('today')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list')
  const [currentDate, setCurrentDate] = useState(new Date(initialDate))
  const { setEditingTodo, setAddTaskModalOpen } = useAppStore()

  // Use SWR for real-time updates
  const { todos: swrTodos } = useSchedule({ fallbackData: initialTodos })
  const todos = Object.keys(swrTodos).length > 0 ? swrTodos : initialTodos

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

  const handleTaskClick = (todo: TodoWithRelations) => {
    setEditingTodo(todo)
    setAddTaskModalOpen(true)
  }

  // Get task position and height for calendar view
  const getTaskStyle = (todo: TodoWithRelations) => {
    if (!todo.scheduledDate) return null
    
    const date = new Date(todo.scheduledDate)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const duration = todo.duration || 30 // Default 30 min if not set
    
    // Calculate position (each hour is 60px tall)
    const top = (hours - 6) * 60 + minutes
    const height = Math.max(duration, 15) // Minimum 15px height
    
    // Don't show tasks outside calendar hours
    if (hours < 6 || hours >= 24) return null
    
    return { top: `${top}px`, height: `${height}px` }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {format(currentDate, 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                displayMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('calendar')}
              className={cn(
                'p-2 rounded-md transition-colors',
                displayMode === 'calendar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Calendar view"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {/* View Toggle */}
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

      {/* List View */}
      {displayMode === 'list' && (
        <div className={cn(
          'grid gap-4',
          view === 'today' ? 'grid-cols-1' : view === '3days' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-7'
        )}>
          {days.map((day) => {
            const dayKey = formatDayKey(day)
            const dayTodos = todos[dayKey] || []
            const isToday = isSameDay(day, new Date())
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

                {/* Tasks - Compact for week view */}
                <div className="space-y-2">
                  {dayTodos.length > 0 ? (
                    view === 'week' ? (
                      // Ultra compact for week view
                      dayTodos.map((todo) => (
                        <button
                          key={todo.id}
                          onClick={() => handleTaskClick(todo)}
                          className={cn(
                            'w-full text-left p-2 rounded-lg border text-xs hover:shadow-sm transition-shadow',
                            'bg-card'
                          )}
                        >
                          <p className="font-medium truncate">{todo.title}</p>
                          {todo.scheduledDate && (
                            <p className="text-muted-foreground">
                              {format(new Date(todo.scheduledDate), 'h:mm a')}
                            </p>
                          )}
                        </button>
                      ))
                    ) : (
                      // Normal cards for today/3days
                      dayTodos.map((todo) => (
                        <TaskCard
                          key={todo.id}
                          todo={todo}
                          compact={view === '3days'}
                          showArea={false}
                        />
                      ))
                    )
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
      )}

      {/* Calendar View */}
      {displayMode === 'calendar' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className={cn(
            'grid',
            view === 'today' ? 'grid-cols-[60px_1fr]' : 
            view === '3days' ? 'grid-cols-[60px_repeat(3,1fr)]' : 
            'grid-cols-[60px_repeat(7,1fr)]'
          )}>
            {/* Time column header */}
            <div className="h-12 border-b border-r bg-muted/30" />
            
            {/* Day headers */}
            {days.map((day) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'h-12 border-b flex items-center justify-center',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <div className="text-center">
                    <p className={cn(
                      'text-xs',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isToday ? 'text-primary' : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Time slots */}
            {CALENDAR_HOURS.map((hour) => (
              <>
                {/* Time label */}
                <div
                  key={`time-${hour}`}
                  className="h-[60px] border-r border-b flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
                
                {/* Day columns */}
                {days.map((day) => {
                  const dayKey = formatDayKey(day)
                  const dayTodos = todos[dayKey] || []
                  const isToday = isSameDay(day, new Date())
                  
                  // Get tasks for this hour
                  const hourTodos = dayTodos.filter((todo) => {
                    if (!todo.scheduledDate) return false
                    const taskHour = new Date(todo.scheduledDate).getHours()
                    return taskHour === hour
                  })

                  return (
                    <div
                      key={`${dayKey}-${hour}`}
                      className={cn(
                        'h-[60px] border-b relative',
                        isToday && 'bg-primary/5',
                        day.getDay() === 0 && 'border-r' // Sunday border
                      )}
                    >
                      {hourTodos.map((todo) => {
                        const style = getTaskStyle(todo)
                        if (!style) return null
                        
                        const priorityColors: Record<number, string> = {
                          1: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300',
                          2: 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300',
                          3: 'bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300',
                          4: 'bg-slate-500/20 border-slate-500 text-slate-700 dark:text-slate-300',
                        }
                        
                        // Position relative to the start of this hour cell
                        const taskDate = new Date(todo.scheduledDate!)
                        const minutesIntoHour = taskDate.getMinutes()
                        const topOffset = minutesIntoHour
                        const duration = todo.duration || 30
                        
                        return (
                          <button
                            key={todo.id}
                            onClick={() => handleTaskClick(todo)}
                            className={cn(
                              'absolute left-0.5 right-0.5 rounded border-l-2 px-1 overflow-hidden text-left hover:shadow-md transition-shadow z-10',
                              priorityColors[todo.priority]
                            )}
                            style={{
                              top: `${topOffset}px`,
                              height: `${Math.max(duration, 20)}px`,
                            }}
                          >
                            <p className="text-xs font-medium truncate leading-tight">
                              {todo.title}
                            </p>
                            {duration >= 30 && (
                              <p className="text-[10px] opacity-75">
                                {format(taskDate, 'h:mm a')}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
