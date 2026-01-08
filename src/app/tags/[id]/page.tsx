import { redirect, notFound } from 'next/navigation'
import { Tag } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getTagWithTodos } from '@/lib/actions/tags'
import { TaskCard } from '@/components/task-card'
import type { TodoWithRelations } from '@/lib/types'

interface TagPageProps {
  params: { id: string }
}

export default async function TagPage({ params }: TagPageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  let tag
  try {
    tag = await getTagWithTodos(params.id)
  } catch {
    notFound()
  }

  const todos = tag.todos.map((t) => t.todo)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${tag.color}20` }}
          >
            <Tag
              className="w-6 h-6"
              style={{ color: tag.color }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {tag.name}
            </h1>
            <p className="text-muted-foreground">
              {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {todos.length > 0 ? (
        <div className="space-y-3">
          {todos.map((todo) => (
            <TaskCard key={todo.id} todo={todo as TodoWithRelations} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No tasks with this tag</p>
        </div>
      )}
    </div>
  )
}
