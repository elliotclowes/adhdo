'use client'

import { useTransition } from 'react'
import { format } from 'date-fns'
import { RotateCcw, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, getPriorityClass, getPriorityLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { uncompleteTodo, deleteTodo } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'

interface CompletedTaskCardProps {
  todo: {
    id: string
    title: string
    description: string | null
    priority: number
    completedAt: Date | null
    area?: {
      id: string
      name: string
      color: string
    } | null
    tags?: { 
      tag: {
        id: string
        name: string
        color: string
      } 
    }[]
    parent?: {
      id: string
      title: string
    } | null
  }
}

export function CompletedTaskCard({ todo }: CompletedTaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const { setEditingTodo, setAddTaskModalOpen } = useAppStore()

  const handleUncomplete = () => {
    startTransition(async () => {
      await uncompleteTodo(todo.id)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTodo(todo.id)
    })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'bg-card rounded-lg border p-3 flex items-center gap-3 group',
        isPending && 'opacity-50'
      )}
    >
      {/* Checkmark */}
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Parent info for sub-tasks */}
        {todo.parent && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              // Note: Can't edit completed parent, but showing the link for context
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"
          >
            <span>↳</span>
            <span className="truncate">{todo.parent.title}</span>
          </button>
        )}
        
        <p className="text-sm text-muted-foreground line-through truncate">
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {todo.area && (
            <span
              className="text-xs"
              style={{ color: todo.area.color }}
            >
              {todo.area.name}
            </span>
          )}
          {todo.completedAt && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(todo.completedAt), 'h:mm a')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleUncomplete}
          disabled={isPending}
          title="Mark as incomplete"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  )
}
