'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Repeat,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn, formatDuration, getPriorityLabel, getPriorityClass } from '@/lib/utils'

// Custom markdown components with proper link styling
const MarkdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:text-primary/80"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
}
import { TaskCheckbox } from './task-checkbox'
import { completeTodo } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'
import type { TodoWithRelations } from '@/lib/types'

interface TaskCardProps {
  todo: TodoWithRelations
  showArea?: boolean
  showSubtasks?: boolean
  compact?: boolean
}

// Calculate time status based on scheduled date/time and duration
function getTimeStatus(scheduledDate: Date, duration: number | null): { label: string; isOverdue: boolean; isDue: boolean } | null {
  const now = new Date()
  const scheduled = new Date(scheduledDate)
  const durationMs = (duration || 0) * 60 * 1000
  const endTime = new Date(scheduled.getTime() + durationMs)
  
  // Task hasn't started yet
  if (now < scheduled) {
    return null
  }
  
  // Task is currently due (between start and end time)
  if (now >= scheduled && now <= endTime) {
    const remainingMs = endTime.getTime() - now.getTime()
    const remainingMins = Math.ceil(remainingMs / 60000)
    
    if (remainingMins <= 60) {
      return { label: `${remainingMins}m left`, isOverdue: false, isDue: true }
    } else {
      const hours = Math.floor(remainingMins / 60)
      const mins = remainingMins % 60
      return { label: mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`, isOverdue: false, isDue: true }
    }
  }
  
  // Task is overdue (past end time)
  const overdueMs = now.getTime() - endTime.getTime()
  const overdueMins = Math.floor(overdueMs / 60000)
  
  if (overdueMins < 60) {
    return { label: `${overdueMins}m overdue`, isOverdue: true, isDue: false }
  } else if (overdueMins < 1440) {
    const hours = Math.floor(overdueMins / 60)
    return { label: `${hours}h overdue`, isOverdue: true, isDue: false }
  } else {
    const days = Math.floor(overdueMins / 1440)
    return { label: `${days}d overdue`, isOverdue: true, isDue: false }
  }
}

export function TaskCard({
  todo,
  showArea = true,
  showSubtasks = true,
  compact = false,
}: TaskCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCompleting, setIsCompleting] = useState(false)
  const { setEditingTodo, setAddTaskModalOpen } = useAppStore()

  const handleComplete = async (checked: boolean) => {
    if (checked) {
      setIsCompleting(true)
      startTransition(async () => {
        await completeTodo(todo.id)
        // Refresh the page data after completion animation
        setTimeout(() => {
          router.refresh()
        }, 500)
      })
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox area or subtasks toggle
    const target = e.target as HTMLElement
    if (target.closest('.checkbox-area') || target.closest('.subtasks-toggle')) {
      return
    }
    
    setEditingTodo(todo)
    setAddTaskModalOpen(true)
  }

  const hasChildren = todo.children && todo.children.length > 0
  const completedChildren = todo.children?.filter((c) => c.isCompleted).length ?? 0
  const totalChildren = todo.children?.length ?? 0

  // Calculate time status
  const timeStatus = todo.scheduledDate 
    ? getTimeStatus(new Date(todo.scheduledDate), todo.duration)
    : null

  return (
    <AnimatePresence mode="popLayout">
      {!isCompleting && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
          onClick={handleCardClick}
          className={cn(
            'task-card bg-card rounded-xl border p-4 relative cursor-pointer',
            compact && 'p-3',
            isPending && 'opacity-60'
          )}
        >
          <div className="flex gap-3">
            {/* Checkbox */}
            <div className="pt-0.5 checkbox-area" onClick={(e) => e.stopPropagation()}>
              <TaskCheckbox
                checked={todo.isCompleted}
                onCheckedChange={handleComplete}
                priority={todo.priority}
                disabled={isPending}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Parent info for sub-tasks */}
              {todo.parent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingTodo(todo.parent as TodoWithRelations)
                    setAddTaskModalOpen(true)
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
                >
                  <span>↳</span>
                  <span className="truncate">{todo.parent.title}</span>
                </button>
              )}
              
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(
                    'font-medium text-foreground',
                    todo.isCompleted && 'line-through text-muted-foreground',
                    compact ? 'text-sm' : 'text-base'
                  )}
                >
                  {todo.title}
                </h3>

                {/* Priority badge */}
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                    getPriorityClass(todo.priority)
                  )}
                >
                  {getPriorityLabel(todo.priority)}
                </span>
              </div>

              {/* Description - always rendered as markdown */}
              {todo.description && !compact && (
                <div className="mt-1 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none line-clamp-2">
                  <ReactMarkdown components={MarkdownComponents}>
                    {todo.description}
                  </ReactMarkdown>
                </div>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {/* Due date/time */}
                {todo.scheduledDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(todo.scheduledDate), 'MMM d, h:mm a')}
                    </span>
                    {/* Time status - only show when due or overdue */}
                    {timeStatus && (
                      <span className={cn(
                        'font-medium',
                        timeStatus.isOverdue && 'text-red-500',
                        timeStatus.isDue && 'text-amber-500'
                      )}>
                        · {timeStatus.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Duration */}
                {todo.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(todo.duration)}</span>
                  </div>
                )}

                {/* Recurring indicator */}
                {todo.isRecurring && (
                  <div className="flex items-center gap-1 text-primary">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Repeating</span>
                  </div>
                )}

                {/* Area */}
                {showArea && todo.area && (
                  <div className="flex items-center gap-1">
                    <span>{todo.area.icon || '📁'}</span>
                    <span style={{ color: todo.area.color }}>
                      {todo.area.name}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {todo.tags && todo.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {todo.tags.slice(0, 3).map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {todo.tags.length > 3 && (
                      <span className="text-muted-foreground">
                        +{todo.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Subtasks count */}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsExpanded(!isExpanded)
                    }}
                    className="subtasks-toggle flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {completedChildren}/{totalChildren} subtasks
                    </span>
                  </button>
                )}
              </div>

              {/* Subtasks */}
              {showSubtasks && hasChildren && isExpanded && (
                <div className="mt-3 pl-2 border-l-2 border-border space-y-2">
                  {todo.children?.map((child) => (
                    <TaskCard
                      key={child.id}
                      todo={child as TodoWithRelations}
                      showArea={false}
                      showSubtasks={true}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
