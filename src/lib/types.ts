import type { Todo, Area, Tag, User } from '@prisma/client'

// Extended types with relations
export type TodoWithRelations = Todo & {
  area?: Area | null
  tags?: { tag: Tag }[]
  children?: TodoWithRelations[]
  parent?: Todo | null
}

export type AreaWithTodos = Area & {
  todos: TodoWithRelations[]
}

export type TagWithTodos = Tag & {
  todos: { todo: TodoWithRelations }[]
}

// Form types
export type CreateTodoInput = {
  title: string
  description?: string
  priority?: number
  scheduledDate?: Date | null
  duration?: number | null
  parentId?: string | null
  areaId?: string | null
  tagIds?: string[]
  isRecurring?: boolean
  recurringPattern?: RecurringPattern | null
}

export type UpdateTodoInput = Partial<CreateTodoInput> & {
  id: string
  isCompleted?: boolean
}

export type CreateAreaInput = {
  name: string
  color?: string
  icon?: string
}

export type CreateTagInput = {
  name: string
  color?: string
}

// Recurring pattern type
export type RecurringPattern = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // Every X days/weeks/months/years
  daysOfWeek?: number[] // For weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number // For monthly
  endDate?: string // ISO date string, when recurrence ends
  count?: number // Number of occurrences
  time?: string // HH:mm format
}

// User preferences type
export type UserPreferences = {
  dailyTaskLimit: number
  vitalTaskLimit?: number | null
  importantTaskLimit?: number | null
  notImportantTaskLimit?: number | null
  somedayTaskLimit?: number | null
  dailySummaryTime: string
  timezone: string
}

// View types for schedule
export type ScheduleView = 'today' | '3days' | 'week'

// Sort and group options
export type SortOption = 'priority' | 'dueDate' | 'createdAt' | 'title'
export type GroupOption = 'none' | 'priority' | 'dueDate' | 'area'

// Auth session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}
