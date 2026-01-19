'use client'

import { SortAsc, CheckCircle2 } from 'lucide-react'
import { useSort, useAreas } from '@/hooks'
import { SortTaskList } from '@/components/sort-task-list'
import type { TodoWithRelations } from '@/lib/types'

interface AreaOption {
  id: string
  name: string
  color: string
  icon: string | null
  requiresScheduling: boolean
}

interface SortContentProps {
  initialData: {
    needsAreaAndDateTime: TodoWithRelations[]
    needsDateTime: TodoWithRelations[]
    needsArea: TodoWithRelations[]
    needsAreaAndDateTimeCount: number
    needsDateTimeCount: number
    needsAreaCount: number
    totalCount: number
  }
  initialAreas: AreaOption[]
}

export function SortContent({ initialData, initialAreas }: SortContentProps) {
  const {
    needsAreaAndDateTime,
    needsDateTime,
    needsArea,
    needsAreaAndDateTimeCount,
    needsDateTimeCount,
    needsAreaCount,
    totalCount,
    mutate,
  } = useSort({ limit: 10, fallbackData: initialData })

  const { areas: swrAreas } = useAreas(
    initialAreas.map(a => ({
      ...a,
      order: 0,
      _count: { todos: 0 },
    }))
  )

  const areas = swrAreas.map(a => ({
    id: a.id,
    name: a.name,
    color: a.color,
    icon: a.icon,
    requiresScheduling: a.requiresScheduling ?? true,
  }))

  const handleDataChange = () => {
    // Trigger SWR revalidation
    mutate()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <SortAsc className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Sort Tasks</h1>
        <p className="text-muted-foreground mt-2">
          {totalCount > 0 ? (
            <>
              You have <span className="font-medium text-amber-600">{totalCount}</span> tasks that need organizing.
            </>
          ) : (
            'All your tasks are sorted!'
          )}
        </p>
      </div>

      {/* Tasks */}
      {totalCount > 0 ? (
        <SortTaskList
          needsAreaAndDateTime={needsAreaAndDateTime}
          needsDateTime={needsDateTime}
          needsArea={needsArea}
          needsAreaAndDateTimeCount={needsAreaAndDateTimeCount}
          needsDateTimeCount={needsDateTimeCount}
          needsAreaCount={needsAreaCount}
          areas={areas}
          onDataChange={handleDataChange}
        />
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-foreground font-medium">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Every task has been assigned an area and scheduled
          </p>
        </div>
      )}
    </div>
  )
}
