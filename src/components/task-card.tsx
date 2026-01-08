'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Clock,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn, formatTimeLeft, formatDuration, getPriorityLabel, getPriorityClass } from '@/lib/utils'
import { TaskCheckbox } from './task-checkbox'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { completeTodo, uncompleteTodo, deleteTodo } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'
import type { TodoWithRelations } from '@/lib/types'

interface TaskCardProps {
  todo: TodoWithRelations
  showArea?: boolean
  showSubtasks?: boolean
  compact?: boolean
}

export function TaskCard({
  todo,
  showArea = true,
  showSubtasks = true,
  compact = false,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCompleting, setIsCompleting] = useState(false)
  const setEditingTodo = useAppStore((state) => state.setEditingTodo)
  const setAddTaskModalOpen = useAppStore((state) => state.setAddTaskModalOpen)

  const handleComplete = async (checked: boolean) => {
    if (checked) {
      setIsCompleting(true)
      startTransition(async () => {
        await completeTodo(todo.id)
        // Small delay before hiding to let animation play
        setTimeout(() => setIsCompleting(false), 100)
      })
    } else {
      startTransition(async () => {
        await uncompleteTodo(todo.id)
      })
    }
  }

  const handleEdit = () => {
    setEditingTodo(todo)
    setAddTaskModalOpen(true)
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTodo(todo.id)
    })
  }

  const hasChildren = todo.children && todo.children.length > 0
  const completedChildren = todo.children?.filter((c) => c.isCompleted).length ?? 0
  const totalChildren = todo.children?.length ?? 0

  return (
    <AnimatePresence mode="popLayout">
      {!isCompleting && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
          className={cn(
            'task-card bg-card rounded-xl border p-4 relative group',
            compact && 'p-3',
            isPending && 'opacity-60'
          )}
        >
          <div className="flex gap-3">
            {/* Checkbox */}
            <div className="pt-0.5">
              <TaskCheckbox
                checked={todo.isCompleted}
                onCheckedChange={handleComplete}
                priority={todo.priority}
                disabled={isPending}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
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

              {/* Description (expandable) */}
              {todo.description && !compact && (
                <div className="mt-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    {isExpanded ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{todo.description}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="line-clamp-1">{todo.description}</span>
                    )}
                  </button>
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
                    <span className="text-primary font-medium">
                      · {formatTimeLeft(new Date(todo.scheduledDate))}
                    </span>
                  </div>
                )}

                {/* Duration */}
                {todo.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(todo.duration)}</span>
                  </div>
                )}

                {/* Area */}
                {showArea && todo.area && (
                  <div className="flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
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
                  <div className="flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>
                      {completedChildren}/{totalChildren} subtasks
                    </span>
                  </div>
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

            {/* Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expand toggle for subtasks */}
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute bottom-2 right-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? 'Hide subtasks' : 'Show subtasks'}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
