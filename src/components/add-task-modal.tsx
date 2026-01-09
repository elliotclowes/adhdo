'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay, isBefore } from 'date-fns'
import { CalendarIcon, Clock, Trash2, X } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import ReactMarkdown from 'react-markdown'
import 'react-day-picker/dist/style.css'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
} from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { cn } from '@/lib/utils'
import { createTodo, updateTodo, deleteTodo, completeTodo, getTodayTaskCounts } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'
import { TaskCheckbox } from './task-checkbox'
import { CompletionStar } from './completion-star'
import type { CreateTodoInput } from '@/lib/types'

interface AddTaskModalProps {
  areas: { id: string; name: string; color: string }[]
  tags: { id: string; name: string; color: string }[]
  parentId?: string
}

// Custom markdown components with proper link styling
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

export function AddTaskModal({ areas, tags, parentId }: AddTaskModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { isAddTaskModalOpen, setAddTaskModalOpen, editingTodo, setEditingTodo } =
    useAppStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [priority, setPriority] = useState('3')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>()
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState('')
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const [limitWarningMessage, setLimitWarningMessage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [recurringInterval, setRecurringInterval] = useState('1')
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false)

  const isEditing = !!editingTodo

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(100, textareaRef.current.scrollHeight)}px`
    }
  }

  useEffect(() => {
    if (isEditingDescription) {
      adjustTextareaHeight()
    }
  }, [description, isEditingDescription])

  // Populate form when editing
  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setDescription(editingTodo.description || '')
      setPriority(String(editingTodo.priority))
      setAreaId(editingTodo.areaId)
      setSelectedTags(editingTodo.tags?.map((t) => t.tag.id) || [])
      if (editingTodo.scheduledDate) {
        const date = new Date(editingTodo.scheduledDate)
        setScheduledDate(date)
        setScheduledTime(format(date, 'HH:mm'))
      } else {
        setScheduledDate(undefined)
        setScheduledTime('')
      }
      if (editingTodo.duration) {
        setDuration(String(editingTodo.duration))
      } else {
        setDuration('')
      }
      // Handle recurring fields
      setIsRecurring(editingTodo.isRecurring || false)
      if (editingTodo.recurringPattern) {
        try {
          const pattern = typeof editingTodo.recurringPattern === 'string'
            ? JSON.parse(editingTodo.recurringPattern)
            : editingTodo.recurringPattern
          setRecurringFrequency(pattern.frequency || 'weekly')
          setRecurringInterval(String(pattern.interval || 1))
        } catch {
          setRecurringFrequency('weekly')
          setRecurringInterval('1')
        }
      }
      setIsEditingDescription(false)
    } else {
      // Reset form for new task
      resetForm()
      setIsEditingDescription(true) // New tasks start in edit mode
    }
  }, [editingTodo])

  // Reset form when modal closes
  useEffect(() => {
    if (!isAddTaskModalOpen) {
      // Small delay to let close animation finish
      setTimeout(() => {
        setEditingTodo(null)
        resetForm()
      }, 200)
    }
  }, [isAddTaskModalOpen, setEditingTodo])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setIsEditingDescription(false)
    setPriority('3')
    setAreaId(null)
    setSelectedTags([])
    setScheduledDate(undefined)
    setScheduledTime('')
    setDuration('')
    setShowLimitWarning(false)
    setShowDeleteConfirm(false)
    setIsRecurring(false)
    setRecurringFrequency('weekly')
    setRecurringInterval('1')
    setShowCompletionAnimation(false)
  }

  const handleClose = () => {
    setAddTaskModalOpen(false)
  }

  // Handle task completion
  const handleComplete = async (checked: boolean) => {
    if (checked && editingTodo) {
      setShowCompletionAnimation(true)
      startTransition(async () => {
        await completeTodo(editingTodo.id)
        setTimeout(() => {
          handleClose()
          router.refresh()
        }, 600)
      })
    }
  }

  // Check limits before saving - only for new tasks, not edits
  const checkLimits = async () => {
    // Skip limit check when editing
    if (isEditing) return true
    
    if (!scheduledDate) return true

    const counts = await getTodayTaskCounts()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDay = new Date(scheduledDate)
    selectedDay.setHours(0, 0, 0, 0)

    if (selectedDay.getTime() !== today.getTime()) return true

    const priorityNum = parseInt(priority)
    const limits = counts.limits

    // Check total limit
    if (limits && counts.total >= limits.dailyTaskLimit) {
      setLimitWarningMessage(
        `You already have ${counts.total} tasks for today. That's your daily limit of ${limits.dailyTaskLimit}. Are you sure you want to add another?`
      )
      return false
    }

    // Check per-priority limits if set
    const priorityLimitMap: Record<number, number | null | undefined> = {
      1: limits?.vitalTaskLimit,
      2: limits?.importantTaskLimit,
      3: limits?.notImportantTaskLimit,
      4: limits?.somedayTaskLimit,
    }

    const priorityLimit = priorityLimitMap[priorityNum]
    const currentCount = counts.byPriority[priorityNum] || 0

    if (priorityLimit && currentCount >= priorityLimit) {
      const priorityNames: Record<number, string> = {
        1: 'Vital',
        2: 'Important',
        3: 'Not Important',
        4: 'Someday',
      }
      setLimitWarningMessage(
        `You already have ${currentCount} ${priorityNames[priorityNum]} tasks for today. That's your limit of ${priorityLimit}. Are you sure you want to add another?`
      )
      return false
    }

    return true
  }

  const handleSubmit = async (overrideLimit = false) => {
    if (!title.trim()) return

    // Check limits (skip if overriding or editing)
    if (!overrideLimit && !showLimitWarning && !isEditing) {
      const withinLimits = await checkLimits()
      if (!withinLimits) {
        setShowLimitWarning(true)
        return
      }
    }

    let finalScheduledDate: Date | null = null
    if (scheduledDate) {
      finalScheduledDate = new Date(scheduledDate)
      if (scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        finalScheduledDate.setHours(hours, minutes, 0, 0)
      }
    }

    const data: CreateTodoInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority: parseInt(priority),
      areaId: areaId || undefined,
      tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      scheduledDate: finalScheduledDate,
      duration: duration ? parseInt(duration) : undefined,
      parentId: parentId || undefined,
      isRecurring,
      recurringPattern: isRecurring ? {
        frequency: recurringFrequency,
        interval: parseInt(recurringInterval) || 1,
        time: scheduledTime || undefined,
      } : undefined,
    }

    startTransition(async () => {
      if (isEditing && editingTodo) {
        await updateTodo({ id: editingTodo.id, ...data })
      } else {
        await createTodo(data)
      }
      handleClose()
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!editingTodo) return
    
    startTransition(async () => {
      await deleteTodo(editingTodo.id)
      handleClose()
      router.refresh()
    })
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  // Disable past dates
  const disabledDays = { before: startOfDay(new Date()) }

  // Validate that selected date isn't in the past
  const handleDateSelect = (date: Date | undefined) => {
    if (date && isBefore(startOfDay(date), startOfDay(new Date()))) {
      return // Don't allow past dates
    }
    setScheduledDate(date)
  }

  return (
    <Dialog open={isAddTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0">
        {/* Completion Animation Overlay */}
        {showCompletionAnimation && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <CompletionStar 
              isVisible={showCompletionAnimation} 
              onComplete={() => setShowCompletionAnimation(false)} 
            />
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                Are you sure you want to delete &quot;{editingTodo?.title}&quot;? This cannot be undone.
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
                {isPending ? 'Deleting...' : 'Delete Task'}
              </Button>
            </div>
          </div>
        ) : showLimitWarning ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {limitWarningMessage}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLimitWarning(false)}
              >
                Go Back
              </Button>
              <Button onClick={() => handleSubmit(true)}>Add Anyway</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Left Column: Title & Description */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r">
              {/* Header with checkbox and title */}
              <div className="flex items-start gap-3 mb-4">
                {isEditing && (
                  <div className="pt-1 shrink-0">
                    <TaskCheckbox
                      checked={false}
                      onCheckedChange={handleComplete}
                      priority={parseInt(priority)}
                      disabled={isPending || showCompletionAnimation}
                      tabIndex={-1}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground"
                    autoFocus={!isEditing}
                  />
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Description
                </Label>
                {isEditingDescription ? (
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      adjustTextareaHeight()
                    }}
                    onBlur={() => {
                      if (isEditing && description.trim()) {
                        setIsEditingDescription(false)
                      }
                    }}
                    placeholder="Add description... (Markdown supported)"
                    className="w-full min-h-[100px] p-3 text-sm bg-muted/50 rounded-lg border resize-none outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus={isEditing}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className={cn(
                      "min-h-[100px] p-3 rounded-lg border cursor-text transition-colors",
                      "hover:bg-muted/30",
                      description ? "bg-transparent" : "bg-muted/50"
                    )}
                  >
                    {description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown components={MarkdownComponents}>
                          {description}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click to add description...
                      </p>
                    )}
                  </div>
                )}
                {isEditingDescription && (
                  <p className="text-xs text-muted-foreground">
                    Markdown supported. Click outside to preview.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="w-full md:w-[320px] p-6 space-y-5 bg-muted/20">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                {isEditing ? 'Edit Task' : 'New Task'}
              </h3>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Vital
                      </span>
                    </SelectItem>
                    <SelectItem value="2">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Important
                      </span>
                    </SelectItem>
                    <SelectItem value="3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Not Important
                      </span>
                    </SelectItem>
                    <SelectItem value="4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Someday
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label className="text-xs">Area</Label>
                <Select
                  value={areaId || 'none'}
                  onValueChange={(v) => setAreaId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No area</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: area.color }}
                          />
                          {area.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'px-2 py-1 rounded-md text-xs transition-all',
                        selectedTags.includes(tag.id)
                          ? 'ring-2 ring-offset-1'
                          : 'opacity-50 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        ringColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No tags yet
                    </span>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {scheduledDate ? (
                          format(scheduledDate, 'MMM d')
                        ) : (
                          <span>Pick date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DayPicker
                        mode="single"
                        selected={scheduledDate}
                        onSelect={handleDateSelect}
                        disabled={disabledDays}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-xs">Duration</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    min="1"
                    max="480"
                    className="w-20 h-9"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>

              {/* Recurring */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="isRecurring" className="text-xs cursor-pointer">
                    Repeat task
                  </Label>
                </div>
                
                {isRecurring && (
                  <div className="flex items-center gap-2 pl-5">
                    <span className="text-xs text-muted-foreground">Every</span>
                    <Input
                      type="number"
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(e.target.value)}
                      min="1"
                      max="30"
                      className="w-14 h-8"
                    />
                    <Select 
                      value={recurringFrequency} 
                      onValueChange={(v) => setRecurringFrequency(v as 'daily' | 'weekly' | 'monthly')}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">day(s)</SelectItem>
                        <SelectItem value="weekly">week(s)</SelectItem>
                        <SelectItem value="monthly">month(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t my-4" />

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  onClick={() => handleSubmit()} 
                  disabled={isPending || !title.trim()}
                  className="w-full"
                >
                  {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Task'}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  
                  {isEditing && (
                    <Button 
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
