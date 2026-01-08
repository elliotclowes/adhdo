'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, ChevronDown, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTodo } from '@/lib/actions/todos'
import { getAreas } from '@/lib/actions/areas'
import type { TodoWithRelations } from '@/lib/types'

interface SortTaskListProps {
  initialTodos: TodoWithRelations[]
  totalCount: number
}

export function SortTaskList({ initialTodos, totalCount }: SortTaskListProps) {
  const router = useRouter()
  const [todos, setTodos] = useState(initialTodos)
  const [areas, setAreas] = useState<{ id: string; name: string; color: string }[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [sortingTodoId, setSortingTodoId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sortedCount, setSortedCount] = useState(0)

  // Load areas on first interaction
  const loadAreas = async () => {
    if (areas.length > 0) return
    setLoadingAreas(true)
    try {
      const fetchedAreas = await getAreas()
      setAreas(fetchedAreas.map((a) => ({ id: a.id, name: a.name, color: a.color })))
    } catch (error) {
      console.error('Failed to load areas:', error)
    } finally {
      setLoadingAreas(false)
    }
  }

  const handleAreaSelect = async (todoId: string, areaId: string) => {
    setSortingTodoId(todoId)
    startTransition(async () => {
      try {
        await updateTodo({ id: todoId, areaId })
        // Remove from local list with animation
        setTodos((prev) => prev.filter((t) => t.id !== todoId))
        setSortedCount((prev) => prev + 1)
        
        // If we've sorted all visible, refresh to get more
        if (todos.length === 1 && totalCount - sortedCount > 1) {
          router.refresh()
        }
      } catch (error) {
        console.error('Failed to update todo:', error)
      } finally {
        setSortingTodoId(null)
      }
    })
  }

  const loadMore = () => {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {sortedCount > 0 && (
        <div className="text-center text-sm text-muted-foreground mb-4">
          Sorted {sortedCount} of {totalCount} tasks
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {todos.map((todo, index) => (
          <motion.div
            key={todo.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-xl border p-4"
          >
            <div className="flex items-start gap-4">
              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{todo.title}</h3>
                {todo.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {todo.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {todo.tags?.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Area Selector */}
              <div className="shrink-0">
                <Select
                  onOpenChange={(open) => open && loadAreas()}
                  onValueChange={(value) => handleAreaSelect(todo.id, value)}
                  disabled={sortingTodoId === todo.id}
                >
                  <SelectTrigger className="w-[180px]">
                    {sortingTodoId === todo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SelectValue placeholder="Assign to area" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {loadingAreas ? (
                      <div className="p-2 text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          <span className="flex items-center gap-2">
                            <FolderOpen
                              className="w-4 h-4"
                              style={{ color: area.color }}
                            />
                            {area.name}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load More */}
      {todos.length < totalCount - sortedCount && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={loadMore}>
            Show more tasks
          </Button>
        </div>
      )}
    </div>
  )
}
