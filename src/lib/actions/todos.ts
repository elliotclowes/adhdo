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

  // Verify ownership and get current state
  const existing = await prisma.todo.findUnique({
    where: { id: input.id },
    select: { 
      userId: true, 
      areaId: true,
      depth: true,
    },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  // If updating area on a parent task (depth 0), update matching children
  if (input.areaId !== undefined && existing.depth === 0) {
    const oldAreaId = existing.areaId
    const newAreaId = input.areaId
    
    // Update children that have the same area as the old parent area
    if (oldAreaId) {
      await prisma.todo.updateMany({
        where: {
          parentId: input.id,
          areaId: oldAreaId,
        },
        data: {
          areaId: newAreaId,
        },
      })
    }
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

  // Verify ownership and get full todo with children
  const existing = await prisma.todo.findUnique({
    where: { id },
    include: {
      children: {
        include: {
          tags: { include: { tag: true } },
        },
      },
      tags: { include: { tag: true } },
      area: true,
    },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Todo not found')
  }

  // Complete the parent todo
  const todo = await prisma.todo.update({
    where: { id },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  })

  // Complete all incomplete children (sub-tasks)
  if (existing.children && existing.children.length > 0) {
    await prisma.todo.updateMany({
      where: {
        parentId: id,
        isCompleted: false,
      },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    })
  }

  // If recurring, create next instance with all children
  if (existing.isRecurring && existing.recurringPattern) {
    const pattern = JSON.parse(existing.recurringPattern as string) as RecurringPattern
    const nextDate = calculateNextOccurrence(new Date(), pattern)
    
    if (nextDate) {
      // Calculate date offset for children
      const parentOldDate = existing.scheduledDate ? new Date(existing.scheduledDate) : null
      const dateOffset = parentOldDate ? nextDate.getTime() - parentOldDate.getTime() : 0
      
      // Create next parent occurrence
      const nextParent = await prisma.todo.create({
        data: {
          userId: existing.userId,
          title: existing.title,
          description: existing.description,
          priority: existing.priority,
          scheduledDate: nextDate,
          duration: existing.duration,
          areaId: existing.areaId,
          isRecurring: existing.isRecurring,
          recurringPattern: existing.recurringPattern as string,
          recurringParentId: id,
          parentId: null,
          depth: 0,
          order: existing.order,
        },
      })

      // Recreate tags for parent
      if (existing.tags && existing.tags.length > 0) {
        await prisma.todoTag.createMany({
          data: existing.tags.map((t: { tag: { id: string } }) => ({
            todoId: nextParent.id,
            tagId: t.tag.id,
          })),
        })
      }

      // Recreate all children with shifted dates
      if (existing.children && existing.children.length > 0) {
        for (const child of existing.children) {
          const childNextDate = child.scheduledDate && dateOffset
            ? new Date(new Date(child.scheduledDate).getTime() + dateOffset)
            : child.scheduledDate

          const nextChild = await prisma.todo.create({
            data: {
              userId: existing.userId,
              title: child.title,
              description: child.description,
              priority: child.priority,
              scheduledDate: childNextDate,
              duration: child.duration,
              areaId: child.areaId,
              parentId: nextParent.id,
              depth: 1,
              order: child.order,
              isRecurring: false, // Children don't repeat independently
              recurringPattern: null,
            },
          })

          // Recreate tags for child
          if (child.tags && child.tags.length > 0) {
            await prisma.todoTag.createMany({
              data: child.tags.map((t: { tag: { id: string } }) => ({
                todoId: nextChild.id,
                tagId: t.tag.id,
              })),
            })
          }
        }
      }
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
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      parent: true, // Include parent info for sub-tasks
      children: {
        where: { isCompleted: false },
        include: {
          children: true,
        },
        orderBy: { order: 'asc' },
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

  // Get areas that require scheduling
  const areasWithScheduling = await prisma.area.findMany({
    where: { userId, requiresScheduling: true },
    select: { id: true },
  })
  const schedulingRequiredAreaIds = areasWithScheduling.map((a: { id: string }) => a.id)

  // Category 1: No area AND no scheduled date
  const needsAreaAndDateTime = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      areaId: null,
      scheduledDate: null,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Category 2: Has area (with requiresScheduling=true) but no scheduled date
  const needsDateTime = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      areaId: { in: schedulingRequiredAreaIds },
      scheduledDate: null,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Category 3: Has scheduled date but no area
  const needsArea = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      areaId: null,
      scheduledDate: { not: null },
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Count totals for each category
  const [needsAreaAndDateTimeCount, needsDateTimeCount, needsAreaCount] = await Promise.all([
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        areaId: null,
        scheduledDate: null,
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        areaId: { in: schedulingRequiredAreaIds },
        scheduledDate: null,
      },
    }),
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        parentId: null,
        areaId: null,
        scheduledDate: { not: null },
      },
    }),
  ])

  const totalCount = needsAreaAndDateTimeCount + needsDateTimeCount + needsAreaCount

  return { 
    needsAreaAndDateTime,
    needsDateTime,
    needsArea,
    needsAreaAndDateTimeCount,
    needsDateTimeCount,
    needsAreaCount,
    totalCount,
  }
}

// Get random todos for Zombie mode
export async function getZombieTodos(count: number = 5) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Get eligible parent todos (not Vital, not completed)
  const parentTodos = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      priority: { not: 1 }, // Skip Vital
      parentId: null,
      depth: 0,
    },
    include: {
      area: true,
      tags: { include: { tag: true } },
      children: {
        where: { isCompleted: false },
        orderBy: { order: 'asc' },
        take: 1, // Only first incomplete sub-task
        include: {
          area: true,
          tags: { include: { tag: true } },
          parent: true,
        },
      },
    },
  })

  // For each parent with sub-tasks, use the first sub-task instead of parent
  // eslint-disable-next-line
  const todos = parentTodos.map((parent: any) => {
    if (parent.children && parent.children.length > 0) {
      return parent.children[0] // Use first sub-task
    }
    return parent // Use parent if no sub-tasks
  })

  // Shuffle and weight by due date proximity
  // eslint-disable-next-line
  const weighted = todos.map((todo: any) => {
    let weight = 1
    if (todo.scheduledDate) {
      const daysUntilDue = Math.ceil(
        (new Date(todo.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
  // eslint-disable-next-line
  const selected: any[] = []
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

// Get task counts for each day in a date range (for calendar display)
export async function getTaskCountsByDate(startDate: Date, endDate: Date) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const tasks = await prisma.todo.findMany({
    where: {
      userId,
      isCompleted: false,
      parentId: null,
      scheduledDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      scheduledDate: true,
    },
  })

  // Group by date
  const countsByDate: Record<string, number> = {}
  for (const task of tasks) {
    if (task.scheduledDate) {
      const dateKey = task.scheduledDate.toISOString().split('T')[0]
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1
    }
  }

  // Get user's daily limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyTaskLimit: true },
  })

  return {
    countsByDate,
    dailyLimit: user?.dailyTaskLimit || 3,
  }
}

// Reorder sub-tasks
export async function reorderSubtasks(parentId: string, subtaskIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership of parent
  const parent = await prisma.todo.findUnique({
    where: { id: parentId },
    select: { userId: true },
  })

  if (!parent || parent.userId !== userId) {
    throw new Error('Parent todo not found')
  }

  // Update order for each subtask
  await Promise.all(
    subtaskIds.map((id, index) =>
      prisma.todo.update({
        where: { id },
        data: { order: index },
      })
    )
  )

  revalidatePath('/')
  return { success: true }
}
