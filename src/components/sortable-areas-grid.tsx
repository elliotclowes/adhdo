'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { reorderAreas } from '@/lib/actions/areas'

type AreaWithCount = {
  id: string
  name: string
  color: string
  icon: string | null
  order: number
  requiresScheduling: boolean
  _count: { todos: number }
}

interface SortableAreaCardProps {
  area: AreaWithCount
  isDragging?: boolean
}

function SortableAreaCard({ area, isDragging }: SortableAreaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: area.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-xl border p-4 group relative',
        isSorting && 'opacity-50 shadow-lg z-10',
        isDragging && 'cursor-grabbing'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      <Link
        href={`/areas/${area.id}`}
        className="block hover:opacity-80 transition-opacity pl-6"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
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
    </div>
  )
}

interface SortableAreasGridProps {
  initialAreas: AreaWithCount[]
}

export function SortableAreasGrid({ initialAreas }: SortableAreasGridProps) {
  const router = useRouter()
  const [areas, setAreas] = useState(initialAreas)
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = areas.findIndex((a) => a.id === active.id)
      const newIndex = areas.findIndex((a) => a.id === over.id)

      const newAreas = arrayMove(areas, oldIndex, newIndex)
      setAreas(newAreas)

      // Save the new order
      startTransition(async () => {
        await reorderAreas(newAreas.map((a) => a.id))
        router.refresh()
      })
    }
  }

  if (areas.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border">
        <span className="text-4xl block mb-4">📁</span>
        <p className="text-muted-foreground">No areas yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create areas to organize your tasks
        </p>
      </div>
    )
  }

  return (
    <div className={cn(isPending && 'opacity-70 pointer-events-none')}>
      <p className="text-xs text-muted-foreground mb-4">
        Drag areas to reorder them
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={areas.map((a) => a.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {areas.map((area) => (
              <SortableAreaCard
                key={area.id}
                area={area}
                isDragging={isDragging}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
