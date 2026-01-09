'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditAreaDialog } from '@/components/edit-area-dialog'

interface AreaHeaderProps {
  area: {
    id: string
    name: string
    color: string
    icon: string | null
    requiresScheduling: boolean
  }
  taskCount: number
}

export function AreaHeader({ area, taskCount }: AreaHeaderProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${area.color}20` }}
            >
              {area.icon || '📁'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {area.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </p>
                {!area.requiresScheduling && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    No scheduling required
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditDialog(true)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      <EditAreaDialog
        area={area}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  )
}
