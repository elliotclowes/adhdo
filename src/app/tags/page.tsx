import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Tag, Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getTags } from '@/lib/actions/tags'
import { CreateTagDialog } from '@/components/create-tag-dialog'

export default async function TagsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const tags = await getTags()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Tags
          </h1>
          <p className="text-muted-foreground mt-1">
            Label and filter your tasks
          </p>
        </div>
        <CreateTagDialog />
      </div>

      {/* Tags List */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-lg border hover:shadow-md transition-shadow"
            >
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: tag.color }}
              />
              <span className="font-medium">{tag.name}</span>
              <span className="text-sm text-muted-foreground">
                {tag._count.todos}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No tags yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create tags to organize and filter your tasks
          </p>
        </div>
      )}
    </div>
  )
}
