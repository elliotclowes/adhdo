'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay, isBefore } from 'date-fns'
import { CalendarIcon, Clock, Trash2, X, GripVertical, Plus, FileText } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import 'react-day-picker/dist/style.css'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { createTodo, updateTodo, deleteTodo, completeTodo, getTodayTaskCounts, reorderSubtasks, getTodo } from '@/lib/actions/todos'
import { useAppStore } from '@/lib/store'
import { TaskCheckbox } from './task-checkbox'
import { CompletionStar } from './completion-star'
import type { CreateTodoInput, TodoWithRelations } from '@/lib/types'

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
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-3 last:mb-0 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-3 last:mb-0 space-y-1">{children}</ol>
  ),
}

// Custom time picker component
function TimePicker({
  value,
  onChange,
  hasError,
}: {
  value: string
  onChange: (time: string) => void
  hasError?: boolean
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 15, 30, 45]
  
  const [hour, minute] = value ? value.split(':').map(Number) : [null, null]
  
  const handleHourChange = (newHour: string) => {
    const currentMinute = minute !== undefined && minute !== null ? minute : 0
    onChange(`${newHour.padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`)
  }
  
  const handleMinuteChange = (newMinute: string) => {
    const currentHour = hour !== undefined && hour !== null ? hour : 0
    onChange(`${String(currentHour).padStart(2, '0')}:${newMinute.padStart(2, '0')}`)
  }
  
  return (
    <div className="flex gap-2 items-center">
      <Select value={value && hour !== null ? String(hour) : undefined} onValueChange={handleHourChange}>
        <SelectTrigger className={cn("w-20 h-9", hasError && "border-red-500")}>
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={value && minute !== null ? String(minute) : undefined} onValueChange={handleMinuteChange}>
        <SelectTrigger className={cn("w-20 h-9", hasError && "border-red-500")}>
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Sortable sub-task item component
function SortableSubtask({
  subtask,
  onEdit,
  onComplete,
  isMobile,
}: {
  subtask: TodoWithRelations
  onEdit: () => void
  onComplete: (checked: boolean) => void
  isMobile: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group",
        subtask.isCompleted && "opacity-60"
      )}
    >
      {/* Priority checkbox - clickable to complete */}
      <div onClick={(e) => e.stopPropagation()}>
        <TaskCheckbox
          checked={subtask.isCompleted}
          onCheckedChange={onComplete}
          priority={subtask.priority}
          disabled={false}
        />
      </div>

      {/* Sub-task title */}
      <button
        onClick={onEdit}
        className={cn(
          "flex-1 text-left text-sm hover:text-primary transition-colors min-w-0",
          subtask.isCompleted && "line-through text-muted-foreground"
        )}
      >
        <span className="break-words">{subtask.title}</span>
      </button>

      {/* Description indicator - only show if description exists */}
      {subtask.description && (
        <button
          onClick={onEdit}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Has description"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Drag handle - always visible on mobile, hover on desktop */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0",
          !isMobile && "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <GripVertical className="w-4 h-4" />
      </button>
    </div>
  )
}

export function AddTaskModal({ areas, tags, parentId }: AddTaskModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { 
    isAddTaskModalOpen, 
    setAddTaskModalOpen, 
    editingTodo, 
    setEditingTodo,
    parentTodoInModal,
    setParentTodoInModal,
  } = useAppStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLTextAreaElement>(null)

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
  const [timeValidationError, setTimeValidationError] = useState(false)
  
  // Sub-tasks state
  const [subtasks, setSubtasks] = useState<TodoWithRelations[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)

  const isEditing = !!editingTodo

  // Drag and drop sensors for sub-task reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
      // Populate sub-tasks (sorted by order)
      if (editingTodo.children && editingTodo.children.length > 0) {
        const sortedChildren = [...editingTodo.children].sort((a, b) => a.order - b.order)
        setSubtasks(sortedChildren)
      } else {
        setSubtasks([])
      }
      setIsEditingDescription(false)
      // Focus close button when editing (keeps view at top, no keyboard on mobile)
      setTimeout(() => {
        closeButtonRef.current?.focus()
        // Adjust title textarea height after content is loaded
        if (titleInputRef.current) {
          titleInputRef.current.style.height = 'auto'
          titleInputRef.current.style.height = titleInputRef.current.scrollHeight + 'px'
        }
      }, 100)
    } else {
      // Reset form for new task
      resetForm()
      setIsEditingDescription(true) // New tasks start in edit mode
      // Focus title input when adding new task
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
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

  const handleClose = async () => {
    // If we were viewing a sub-task from parent modal, return to parent
    if (parentTodoInModal) {
      // Reset animation state when switching from sub-task to parent
      setShowCompletionAnimation(false)
      
      // Fetch fresh parent data to ensure children list is up-to-date
      try {
        const freshParent = await getTodo(parentTodoInModal.id)
        setEditingTodo(freshParent as TodoWithRelations)
        setParentTodoInModal(null)
      } catch (error) {
        console.error('Failed to fetch parent:', error)
        // Fallback to cached parent
        setEditingTodo(parentTodoInModal)
        setParentTodoInModal(null)
      }
    } else {
      setAddTaskModalOpen(false)
      setEditingTodo(null)
    }
  }

  // Handle task completion
  const handleComplete = async (checked: boolean) => {
    if (checked && editingTodo) {
      setShowCompletionAnimation(true)
      startTransition(async () => {
        await completeTodo(editingTodo.id)
        setTimeout(() => {
          // Reset animation before switching views
          setShowCompletionAnimation(false)
          
          // Small delay to ensure animation state is cleared
          setTimeout(() => {
            handleClose()
            router.refresh()
          }, 50)
        }, 550)
      })
    }
  }

  // Add new sub-task
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !editingTodo) return
    
    setIsAddingSubtask(true)
    startTransition(async () => {
      try {
        const newSubtask = await createTodo({
          title: newSubtaskTitle.trim(),
          priority: parseInt(priority),
          areaId: areaId, // Inherit parent's area
          parentId: editingTodo.id,
        })
        
        // Add to local state
        setSubtasks([...subtasks, newSubtask as TodoWithRelations])
        setNewSubtaskTitle('')
        router.refresh()
      } catch (error) {
        console.error('Failed to create sub-task:', error)
      } finally {
        setIsAddingSubtask(false)
      }
    })
  }

  // Open sub-task for editing
  const handleEditSubtask = (subtask: TodoWithRelations) => {
    // Store current parent in modal history
    if (editingTodo) {
      setParentTodoInModal(editingTodo)
    }
    // Open sub-task
    setEditingTodo(subtask)
  }

  // Complete/uncomplete a sub-task
  const handleCompleteSubtask = async (subtaskId: string, checked: boolean) => {
    startTransition(async () => {
      try {
        await updateTodo({ id: subtaskId, isCompleted: checked })
        // Update local state
        setSubtasks(subtasks.map(st => 
          st.id === subtaskId ? { ...st, isCompleted: checked } : st
        ))
        router.refresh()
      } catch (error) {
        console.error('Failed to complete sub-task:', error)
      }
    })
  }

  // Handle drag end for sub-task reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id && editingTodo) {
      setSubtasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        
        const newOrder = arrayMove(items, oldIndex, newIndex)
        
        // Save new order to backend
        startTransition(async () => {
          await reorderSubtasks(
            editingTodo.id,
            newOrder.map((item) => item.id)
          )
        })
        
        return newOrder
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

    // Validate time if date is set
    if (scheduledDate && !scheduledTime) {
      setTimeValidationError(true)
      return
    }
    
    // Clear validation error if we get here
    setTimeValidationError(false)

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
      duration: duration ? parseInt(duration) : (finalScheduledDate ? 15 : undefined),
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
    
    // Clear validation error if date is cleared
    if (!date) {
      setTimeValidationError(false)
    }
  }

  return (
    <Dialog open={isAddTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
      <DialogContent className="fixed sm:max-w-[800px] w-full h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-y-auto p-0 gap-0 sm:rounded-lg rounded-none left-0 top-0 sm:left-[50%] sm:top-[50%] translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%]">
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
                      checked={editingTodo?.isCompleted || false}
                      onCheckedChange={handleComplete}
                      priority={parseInt(priority)}
                      disabled={isPending || showCompletionAnimation}
                      tabIndex={-1}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    ref={titleInputRef as React.RefObject<HTMLTextAreaElement>}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    rows={1}
                    className={cn(
                      "w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground resize-none overflow-hidden",
                      editingTodo?.isCompleted && "line-through text-muted-foreground"
                    )}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = target.scrollHeight + 'px'
                    }}
                  />
                  
                  {/* Parent task indicator for sub-tasks - below title */}
                  {isEditing && (editingTodo?.parent || parentTodoInModal) && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault()
                        const parentId = editingTodo?.parent?.id || parentTodoInModal?.id
                        if (parentId) {
                          try {
                            const fullParent = await getTodo(parentId)
                            setEditingTodo(fullParent as TodoWithRelations)
                            setParentTodoInModal(null)
                          } catch (error) {
                            console.error('Failed to fetch parent:', error)
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 group"
                    >
                      <span>↳</span>
                      <span className="font-medium group-hover:underline">
                        Parent: {editingTodo?.parent?.title || parentTodoInModal?.title}
                      </span>
                    </button>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
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
                        <ReactMarkdown 
                          components={MarkdownComponents}
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
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

              {/* Sub-tasks section - only show when editing parent task */}
              {isEditing && editingTodo && editingTodo.depth === 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Sub-tasks
                  </Label>
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={subtasks.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {subtasks.map((subtask) => (
                          <SortableSubtask
                            key={subtask.id}
                            subtask={subtask}
                            onEdit={() => handleEditSubtask(subtask)}
                            onComplete={(checked) => handleCompleteSubtask(subtask.id, checked)}
                            isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Quick add sub-task input */}
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddSubtask()
                        }
                      }}
                      placeholder="Add sub-task..."
                      className="flex-1 text-sm"
                      disabled={isAddingSubtask}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                      style={
                        {
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          '--tw-ring-color': tag.color,
                        } as React.CSSProperties
                      }
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
                  {/* Native date input for mobile, Popover for desktop */}
                  <div className="relative">
                    {/* Native input for mobile - hidden but functional */}
                    <input
                      type="date"
                      value={scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + 'T00:00:00')
                          handleDateSelect(date)
                        } else {
                          setScheduledDate(undefined)
                        }
                      }}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="md:hidden absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    {/* Visual button that shows selected date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className={cn(
                            'w-full justify-start text-left font-normal pointer-events-none md:pointer-events-auto',
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
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Time</Label>
                  <TimePicker
                    value={scheduledTime}
                    onChange={(time) => {
                      setScheduledTime(time)
                      setTimeValidationError(false)
                    }}
                    hasError={timeValidationError}
                  />
                  {timeValidationError && (
                    <p className="text-xs text-red-500">
                      A task isn&apos;t &quot;planned&quot; until it has a date and a <strong>time</strong>. Please choose a time.
                    </p>
                  )}
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
                    placeholder="15"
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
                  disabled={isPending || !title.trim() || (scheduledDate && !scheduledTime)}
                  className="w-full"
                >
                  {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Task'}
                </Button>
                
                {/* Helper text when button is disabled due to missing time */}
                {scheduledDate && !scheduledTime && title.trim() && (
                  <p className="text-xs text-center text-muted-foreground">
                    Please select a time to save this task
                  </p>
                )}
                
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
