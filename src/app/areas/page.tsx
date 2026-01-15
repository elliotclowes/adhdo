import { redirect } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getAreas } from '@/lib/actions/areas'
import { CreateAreaDialog } from '@/components/create-area-dialog'
import { SortableAreasGrid } from '@/components/sortable-areas-grid'

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

      {/* Sortable Areas Grid */}
      <SortableAreasGrid initialAreas={areas} />
    </div>
  )
}
