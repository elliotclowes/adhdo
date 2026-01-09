'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { CreateTodoInput, UpdateTodoInput, RecurringPattern, TodoWithRelations } from '@/lib/types'

export async function createTodo(input: CreateTodoInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Calculate depth if parentId is provided
  let depth = 0
  if (input.parentId) {
    const parent = await prisma.todo.findUnique({
      where: { id: input.parentId },
      select: { depth: true },
    })
    if (parent) {
      depth = parent.depth + 1
      if (depth > 2) {
        throw new Error('Maximum nesting depth is 3 levels')
      }
    }
  }

  // Get max order for positioning
  const maxOrderTodo = await prisma.todo.findFirst({
    where: {
      userId,
      parentId: input.parentId ?? null,
    },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const todo = await prisma.todo.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority ?? 3,
      scheduledDate: input.scheduledDate,
      duration: input.duration,
      parentId: input.parentId,
      areaId: input.areaId,
      isRecurring: input.isRecurring ?? false,
      recurringPattern: input.recurringPattern ? JSON.stringify(input.recurringPattern) : null,
      depth,
      order: (maxOrderTodo?.order ?? 0) + 1,
      userId,
      tags: input.tagIds?.length
        ? {
            create: input.tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          }
        : undefined,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      children: true,
    },
  })

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/schedule')
  revalidatePath('/sort')

  return todo
}

export async function updateTodo(input: UpdateTodoInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.todo.findUnique({
    where: { id: input.id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  // Handle tag updates separately
  if (input.tagIds !== undefined) {
    // Remove existing tags
    await prisma.todoTag.deleteMany({
      where: { todoId: input.id },
    })
    // Add new tags
    if (input.tagIds.length > 0) {
      await prisma.todoTag.createMany({
        data: input.tagIds.map((tagId) => ({
          todoId: input.id,
          tagId,
        })),
      })
    }
  }

  const todo = await prisma.todo.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.areaId !== undefined && { areaId: input.areaId }),
      ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
      ...(input.recurringPattern !== undefined && {
        recurringPattern: input.recurringPattern ? JSON.stringify(input.recurringPattern) : null,
      }),
      ...(input.isCompleted !== undefined && {
        isCompleted: input.isCompleted,
        completedAt: input.isCompleted ? new Date() : null,
      }),
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      children: true,
    },
  })

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/schedule')
  revalidatePath('/completed')

  return todo
}

export async function completeTodo(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.todo.findUnique({
    where: { id },
    select: { userId: true, isRecurring: true, recurringPattern: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  // Complete the todo
  const todo = await prisma.todo.update({
    where: { id },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  })

  // If recurring, create next instance
  if (existing.isRecurring && existing.recurringPattern) {
    const pattern = JSON.parse(existing.recurringPattern) as RecurringPattern
    const nextDate = calculateNextOccurrence(new Date(), pattern)
    
    if (nextDate) {
      await prisma.todo.create({
        data: {
          ...todo,
          id: undefined,
          isCompleted: false,
          completedAt: null,
          scheduledDate: nextDate,
          recurringParentId: id,
          createdAt: undefined,
          updatedAt: undefined,
        },
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/schedule')
  revalidatePath('/completed')

  return todo
}

export async function uncompleteTodo(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.todo.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  const todo = await prisma.todo.update({
    where: { id },
    data: {
      isCompleted: false,
      completedAt: null,
    },
  })

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/schedule')
  revalidatePath('/completed')

  return todo
}

export async function deleteTodo(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.todo.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  await prisma.todo.delete({
    where: { id },
  })

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/schedule')
  revalidatePath('/sort')
  revalidatePath('/completed')

  return { success: true }
}

// Helper function to calculate next recurring occurrence
function calculateNextOccurrence(fromDate: Date, pattern: RecurringPattern): Date | null {
  const next = new Date(fromDate)
  
  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + pattern.interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + (pattern.interval * 7))
      break
    case 'monthly':
      next.setMonth(next.getMonth() + pattern.interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + pattern.interval)
      break
  }
  
  // Set time if specified
  if (pattern.time) {
    const [hours, minutes] = pattern.time.split(':').map(Number)
    next.setHours(hours, minutes, 0, 0)
  }
  
  // Check if past end date
  if (pattern.endDate && next > new Date(pattern.endDate)) {
    return null
  }
  
  return next
}

// Get todos for today with limit checking
export async function getTodosForToday() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null, // Only top-level todos
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      children: {
        include: {
          children: true,
        },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { scheduledDate: 'asc' },
      { order: 'asc' },
    ],
  })

  return todos
}

// Get todos needing sorting (no area assigned)
export async function getUnsortedTodos(limit: number = 5) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      areaId: null,
      parentId: null, // Only top-level todos
    },
    include: {
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  const totalCount = await prisma.todo.count({
    where: {
      userId,
      isCompleted: false,
      areaId: null,
      parentId: null,
    },
  })

  return { todos, totalCount }
}

// Get random todos for Zombie mode
export async function getZombieTodos(count: number = 5): Promise<TodoWithRelations[]> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Get eligible todos (not Vital, not completed)
  const todos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      priority: { not: 1 }, // Skip Vital
      parentId: null,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
    },
  })

  // Shuffle and weight by due date proximity
  const weighted = todos.map((todo: TodoWithRelations) => {
    let weight = 1
    if (todo.scheduledDate) {
      const daysUntilDue = Math.ceil(
        (todo.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      // Higher weight for sooner due dates
      weight = Math.max(1, 10 - daysUntilDue)
    }
    // Lower weight for potentially difficult tasks (longer duration)
    if (todo.duration && todo.duration > 60) {
      weight *= 0.5
    }
    return { todo, weight }
  })

  // Weighted random selection
  const selected: typeof todos = []
  const remaining = [...weighted]
  
  while (selected.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0)
    let random = Math.random() * totalWeight
    
    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].weight
      if (random <= 0) {
        selected.push(remaining[i].todo)
        remaining.splice(i, 1)
        break
      }
    }
  }

  return selected
}

// Get task counts for today (for limit checking)
export async function getTodayTaskCounts() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyTaskLimit: true,
      vitalTaskLimit: true,
      importantTaskLimit: true,
      notImportantTaskLimit: true,
      somedayTaskLimit: true,
    },
  })

  const counts = await prisma.todo.groupBy({
    by: ['priority'],
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    _count: true,
  })

  const totalCount = counts.reduce((sum: number, c: { priority: number; _count: number }) => sum + c._count, 0)
  const byPriority = Object.fromEntries(
    counts.map((c: { priority: number; _count: number }) => [c.priority, c._count])
  )

  return {
    total: totalCount,
    byPriority,
    limits: user,
  }
}
