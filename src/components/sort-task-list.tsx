'use client'

import { useState, useTransition, useEffect } from 'react'
import { format, addDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { Calendar, Clock, Loader2, Pencil, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateTodo, getTaskCountsByDate } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { TodoWithRelations } from '@/lib/types'

// Custom markdown components
const MarkdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:text-primary/80"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
}

interface AreaOption {
  id: string
  name: string
  color: string
  icon: string | null
  requiresScheduling: boolean
}

interface SortTaskListProps {
  needsAreaAndDateTime: TodoWithRelations[]
  needsDateTime: TodoWithRelations[]
  needsArea: TodoWithRelations[]
  needsAreaAndDateTimeCount: number
  needsDateTimeCount: number
  needsAreaCount: number
  areas: AreaOption[]
  onDataChange?: () => void
}

// Sort task card component
function SortTaskCard({
  todo,
  areas,
  showAreaPicker,
  showDatePicker,
  onSorted,
  onDataChange,
}: {
  todo: TodoWithRelations
  areas: AreaOption[]
  showAreaPicker: boolean
  showDatePicker: boolean
  onSorted: () => void
  onDataChange?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const [dateCounts, setDateCounts] = useState<Record<string, number>>({})
  const [dailyLimit, setDailyLimit] = useState(3)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { setEditingTodo, setAddTaskModalOpen } = useAppStore()

  // Pre-load task counts for today and tomorrow on mount
  useEffect(() => {
    const loadInitialCounts = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dayAfterTomorrow = addDays(today, 2)
      dayAfterTomorrow.setHours(23, 59, 59, 999)
      
      const result = await getTaskCountsByDate(today, dayAfterTomorrow)
      setDateCounts(result.countsByDate)
      setDailyLimit(result.dailyLimit)
    }
    loadInitialCounts()
  }, [])

  // Load full calendar counts when calendar opens
  useEffect(() => {
    if (showScheduleDialog) {
      const loadCounts = async () => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(addDays(currentMonth, 60)) // Get 2 months
        const result = await getTaskCountsByDate(start, end)
        setDateCounts(result.countsByDate)
        setDailyLimit(result.dailyLimit)
      }
      loadCounts()
    }
  }, [showScheduleDialog, currentMonth])

  const handleAreaSelect = async (areaId: string) => {
    startTransition(async () => {
      await updateTodo({ id: todo.id, areaId })
      onSorted()
      onDataChange?.()
    })
  }

  const handleQuickDate = async (date: Date) => {
    setSelectedDate(date)
    // Check if this date is at/over limit
    const dateKey = format(date, 'yyyy-MM-dd')
    const count = dateCounts[dateKey] || 0
    if (count >= dailyLimit) {
      setShowLimitWarning(true)
    } else {
      setShowScheduleDialog(true)
    }
  }

  const handleScheduleConfirm = async (force: boolean = false) => {
    if (!selectedDate) return
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const count = dateCounts[dateKey] || 0
    
    if (!force && count >= dailyLimit) {
      setShowLimitWarning(true)
      return
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const scheduledDate = new Date(selectedDate)
    scheduledDate.setHours(hours, minutes, 0, 0)

    startTransition(async () => {
      await updateTodo({ id: todo.id, scheduledDate })
      setShowScheduleDialog(false)
      setShowLimitWarning(false)
      onSorted()
      onDataChange?.()
    })
  }

  const handleEditClick = () => {
    setEditingTodo(todo)
    setAddTaskModalOpen(true)
  }

  // Day content for calendar with count badges
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    const count = dateCounts[dateKey] || 0
    const isOverLimit = count >= dailyLimit
    const isAtLimit = count === dailyLimit - 1

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{day.getDate()}</span>
        {count > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center font-medium',
              isOverLimit
                ? 'bg-red-500 text-white'
                : isAtLimit
                ? 'bg-amber-500 text-white'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {count}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={cn(
          'bg-card rounded-xl border p-4',
          isPending && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="space-y-3">
          {/* Task Info */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground">{todo.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditClick}
                className="h-8 w-8 shrink-0"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            {todo.description && (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown components={MarkdownComponents}>
                  {todo.description}
                </ReactMarkdown>
              </div>
            )}
            {/* Current area if any */}
            {todo.area && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>{todo.area.icon || '📁'}</span>
                <span style={{ color: todo.area.color }}>{todo.area.name}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Area buttons */}
            {showAreaPicker && (
              <div className="flex flex-wrap gap-1.5 w-full">
                {areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => handleAreaSelect(area.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <span>{area.icon || '📁'}</span>
                    <span>{area.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Date buttons */}
            {showDatePicker && (
              <div className="flex flex-wrap gap-1.5 w-full">
                <button
                  onClick={() => handleQuickDate(new Date())}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Today
                  {dateCounts[format(new Date(), 'yyyy-MM-dd')] >= dailyLimit && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
                <button
                  onClick={() => handleQuickDate(addDays(new Date(), 1))}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Tomorrow
                  {dateCounts[format(addDays(new Date(), 1), 'yyyy-MM-dd')] >= dailyLimit && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
                <button
                  onClick={() => setShowScheduleDialog(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Pick date...
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Calendar */}
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={{ before: new Date() }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                components={{
                  DayContent: ({ date }) => renderDay(date),
                }}
                className="border rounded-lg p-2"
              />
            </div>

            {/* Time picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>At limit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>Over limit</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleScheduleConfirm(false)}
                disabled={!selectedDate || isPending}
                className="flex-1"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Over Limit Warning Dialog */}
      <Dialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Daily Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You already have {dailyLimit}+ tasks scheduled for {selectedDate && format(selectedDate, 'MMMM d')}.
                Adding more may be overwhelming.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLimitWarning(false)
                  setShowScheduleDialog(true)
                }}
                className="flex-1"
              >
                Pick Different Date
              </Button>
              <Button
                onClick={() => handleScheduleConfirm(true)}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Anyway'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SortTaskList({
  needsAreaAndDateTime,
  needsDateTime,
  needsArea,
  needsAreaAndDateTimeCount,
  needsDateTimeCount,
  needsAreaCount,
  areas,
  onDataChange,
}: SortTaskListProps) {
  const [sortedIds, setSortedIds] = useState<Set<string>>(new Set())

  const handleSorted = (todoId: string) => {
    setSortedIds((prev) => new Set(Array.from(prev).concat(todoId)))
  }

  const visibleNeedsAreaAndDateTime = needsAreaAndDateTime.filter((t) => !sortedIds.has(t.id))
  const visibleNeedsDateTime = needsDateTime.filter((t) => !sortedIds.has(t.id))
  const visibleNeedsArea = needsArea.filter((t) => !sortedIds.has(t.id))

  return (
    <div className="space-y-8">
      {/* Section 1: Needs Area and Date/Time */}
      {visibleNeedsAreaAndDateTime.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Needs Area & Date/Time
            </h2>
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {needsAreaAndDateTimeCount - sortedIds.size}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleNeedsAreaAndDateTime.map((todo) => (
                <SortTaskCard
                  key={todo.id}
                  todo={todo}
                  areas={areas}
                  showAreaPicker={true}
                  showDatePicker={true}
                  onSorted={() => handleSorted(todo.id)}
                  onDataChange={onDataChange}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Section 2: Needs Date/Time */}
      {visibleNeedsDateTime.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Needs Date/Time
            </h2>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {needsDateTimeCount}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleNeedsDateTime.map((todo) => (
                <SortTaskCard
                  key={todo.id}
                  todo={todo}
                  areas={areas}
                  showAreaPicker={false}
                  showDatePicker={true}
                  onSorted={() => handleSorted(todo.id)}
                  onDataChange={onDataChange}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Section 3: Needs Area */}
      {visibleNeedsArea.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Needs Area
            </h2>
            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
              {needsAreaCount}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleNeedsArea.map((todo) => (
                <SortTaskCard
                  key={todo.id}
                  todo={todo}
                  areas={areas}
                  showAreaPicker={true}
                  showDatePicker={false}
                  onSorted={() => handleSorted(todo.id)}
                  onDataChange={onDataChange}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  )
}
