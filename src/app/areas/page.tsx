import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getAreas } from '@/lib/actions/areas'
import { CreateAreaDialog } from '@/components/create-area-dialog'

type AreaWithCount = {
  id: string
  name: string
  color: string
  icon: string | null
  order: number
  requiresScheduling: boolean
  _count: { todos: number }
}

export default async function AreasPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const areas = await getAreas() as AreaWithCount[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            Areas
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your tasks into areas of focus
          </p>
        </div>
        <CreateAreaDialog />
      </div>

      {/* Areas Grid */}
      {areas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/areas/${area.id}`}
              className="bg-card rounded-xl border p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${area.color}20` }}
                >
                  {area.icon || '📁'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {area.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground">
                      {area._count.todos} {area._count.todos === 1 ? 'task' : 'tasks'}
                    </p>
                    {!area.requiresScheduling && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        No scheduling required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <span className="text-4xl block mb-4">📁</span>
          <p className="text-muted-foreground">No areas yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create areas to organize your tasks
          </p>
        </div>
      )}
    </div>
  )
}
