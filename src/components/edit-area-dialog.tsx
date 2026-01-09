'use client'

import { useState, useTransition, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateArea, deleteArea } from '@/lib/actions/areas'
import { useRouter } from 'next/navigation'

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
]

const EMOJIS = [
  '📁', '📂', '🏠', '💼', '🎯', '🔥', '💡', '📝',
  '🎨', '🎬', '🎮', '🎵', '📚', '💪', '🏃', '🧘',
  '🍎', '💊', '🛒', '💰', '📊', '🔧', '🌱', '🌍',
  '✈️', '🚗', '🏖️', '🎁', '❤️', '💜', '💭', '⭐',
  '🔔', '📅', '🗂️', '📌', '🎓', '💻', '📱', '🏡',
]

interface EditAreaDialogProps {
  area: {
    id: string
    name: string
    color: string
    icon: string | null
    requiresScheduling: boolean
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAreaDialog({ area, open, onOpenChange }: EditAreaDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(area.name)
  const [color, setColor] = useState(area.color)
  const [icon, setIcon] = useState(area.icon || '📁')
  const [requiresScheduling, setRequiresScheduling] = useState(area.requiresScheduling)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Reset form when area changes
  useEffect(() => {
    setName(area.name)
    setColor(area.color)
    setIcon(area.icon || '📁')
    setRequiresScheduling(area.requiresScheduling)
    setShowDeleteConfirm(false)
  }, [area])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      await updateArea(area.id, { 
        name: name.trim(), 
        color, 
        icon,
        requiresScheduling 
      })
      onOpenChange(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteArea(area.id)
      onOpenChange(false)
      router.push('/areas')
    })
  }

  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                Are you sure you want to delete &quot;{area.name}&quot;? Tasks in this area will become unassigned.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Delete Area'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Area</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon and Name */}
          <div className="space-y-2">
            <Label htmlFor="editAreaName">Name</Label>
            <div className="flex gap-2">
              <div className="text-2xl w-10 h-10 flex items-center justify-center bg-muted rounded-lg">
                {icon}
              </div>
              <Input
                id="editAreaName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Area name..."
                className="flex-1"
                autoFocus
              />
            </div>
          </div>

          {/* Emoji Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 text-lg rounded-md hover:bg-muted transition-colors ${
                    icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Scheduling Requirement Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Require date/time for tasks</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tasks in this area will show in Sort until scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresScheduling(!requiresScheduling)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  requiresScheduling ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    requiresScheduling ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
