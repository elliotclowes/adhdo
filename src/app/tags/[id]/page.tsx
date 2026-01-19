import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTagWithTodos } from '@/lib/actions/tags'
import { TagContent } from '@/components/tag-content'
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

  const todos: TodoWithRelations[] = tag.todos.map((t: { todo: TodoWithRelations }) => t.todo)

  return (
    <TagContent
      tagId={params.id}
      initialTag={{
        id: tag.id,
        name: tag.name,
        color: tag.color,
      }}
      initialTodos={todos}
    />
  )
}
