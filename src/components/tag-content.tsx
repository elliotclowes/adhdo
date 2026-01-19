'use client'

import { Tag as TagIcon } from 'lucide-react'
import { useTag } from '@/hooks'
import { TaskCard } from '@/components/task-card'
import type { TodoWithRelations } from '@/lib/types'

interface TagContentProps {
  tagId: string
  initialTag: {
    id: string
    name: string
    color: string
  }
  initialTodos: TodoWithRelations[]
}

export function TagContent({ tagId, initialTag, initialTodos }: TagContentProps) {
  const { tag, todos } = useTag(tagId, {
    fallbackData: {
      id: initialTag.id,
      name: initialTag.name,
      color: initialTag.color,
      todos: initialTodos.map(todo => ({ todo })),
    },
  })

  const displayTag = tag ?? initialTag
  const displayTodos = todos.length > 0 ? todos : initialTodos

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${displayTag.color}20` }}
          >
            <TagIcon
              className="w-6 h-6"
              style={{ color: displayTag.color }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {displayTag.name}
            </h1>
            <p className="text-muted-foreground">
              {displayTodos.length} {displayTodos.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {displayTodos.length > 0 ? (
        <div className="space-y-3">
          {displayTodos.map((todo) => (
            <TaskCard key={todo.id} todo={todo as TodoWithRelations} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <TagIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No tasks with this tag</p>
        </div>
      )}
    </div>
  )
}
