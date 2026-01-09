import { redirect } from 'next/navigation'
import { format, startOfWeek, addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay } from 'date-fns'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ScheduleClient } from '@/components/schedule-client'
import type { TodoWithRelations } from '@/lib/types'

// Generate recurring task instances for a date range
function generateRecurringInstances(
  todo: TodoWithRelations,
  startRange: Date,
  endRange: Date
): TodoWithRelations[] {
  if (!todo.isRecurring || !todo.recurringPattern || !todo.scheduledDate) {
    return []
  }

  const instances: TodoWithRelations[] = []
  let pattern: { frequency: string; interval: number; time?: string }
  
  try {
    pattern = typeof todo.recurringPattern === 'string' 
      ? JSON.parse(todo.recurringPattern)
      : todo.recurringPattern as { frequency: string; interval: number; time?: string }
  } catch {
    return []
  }

  const originalDate = new Date(todo.scheduledDate)
  let currentDate = new Date(originalDate)
  
  // Start from the original date and generate instances
  const maxIterations = 100 // Safety limit
  let iterations = 0
  
  while (isBefore(currentDate, endRange) && iterations < maxIterations) {
    iterations++
    
    // Skip if before start range or before original date
    if (!isBefore(currentDate, startRange) && !isBefore(currentDate, startOfDay(originalDate))) {
      // Skip the original instance (it's already in the list)
      if (currentDate.getTime() !== originalDate.getTime()) {
        instances.push({
          ...todo,
          id: `${todo.id}-recurring-${format(currentDate, 'yyyy-MM-dd')}`,
          scheduledDate: new Date(currentDate),
          // Mark as a generated instance
          _isRecurringInstance: true,
        } as TodoWithRelations & { _isRecurringInstance?: boolean })
      }
    }
    
    // Move to next occurrence
    switch (pattern.frequency) {
      case 'daily':
        currentDate = addDays(currentDate, pattern.interval)
        break
      case 'weekly':
        currentDate = addWeeks(currentDate, pattern.interval)
        break
      case 'monthly':
        currentDate = addMonths(currentDate, pattern.interval)
        break
      default:
        return instances
    }
  }
  
  return instances
}

async function getScheduleData(userId: string) {
  // Get todos for the next 4 weeks to cover all views plus recurring generation
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = addDays(start, 35) // 5 weeks ahead for buffer

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      OR: [
        // Regular scheduled tasks
        {
          scheduledDate: {
            gte: start,
            lte: end,
          },
        },
        // Recurring tasks (may have original date before range but recur into it)
        {
          isRecurring: true,
          scheduledDate: {
            not: null,
          },
        },
      ],
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      parent: true, // Include parent info for sub-tasks
      children: {
        where: { isCompleted: false },
        include: {
          children: true,
          tags: { include: { tag: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ scheduledDate: 'asc' }, { priority: 'asc' }],
  })

  // Generate recurring instances
  const allTodos: TodoWithRelations[] = []
  
  for (const todo of todos) {
    // Add the original todo if it's in range
    if (todo.scheduledDate) {
      const todoDate = new Date(todo.scheduledDate)
      if (!isBefore(todoDate, start) && !isAfter(todoDate, end)) {
        allTodos.push(todo as TodoWithRelations)
      }
    }
    
    // Generate recurring instances
    if (todo.isRecurring) {
      const instances = generateRecurringInstances(todo as TodoWithRelations, start, end)
      allTodos.push(...instances)
    }
  }

  // Group by date
  const grouped: Record<string, TodoWithRelations[]> = {}
  allTodos.forEach((todo) => {
    if (todo.scheduledDate) {
      const key = format(new Date(todo.scheduledDate), 'yyyy-MM-dd')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(todo)
    }
  })
  
  // Sort each day's tasks
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => {
      const dateA = new Date(a.scheduledDate!).getTime()
      const dateB = new Date(b.scheduledDate!).getTime()
      if (dateA !== dateB) return dateA - dateB
      return a.priority - b.priority
    })
  })

  return grouped
}

export default async function SchedulePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const todos = await getScheduleData(session.user.id)

  return (
    <ScheduleClient
      initialTodos={todos}
      initialDate={new Date().toISOString()}
    />
  )
}
