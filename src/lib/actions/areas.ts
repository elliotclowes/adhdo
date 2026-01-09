'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { CreateAreaInput } from '@/lib/types'

export async function createArea(input: CreateAreaInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Get max order
  const maxOrderArea = await prisma.area.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const area = await prisma.area.create({
    data: {
      name: input.name,
      color: input.color ?? '#6366f1',
      icon: input.icon ?? '📁',
      order: (maxOrderArea?.order ?? 0) + 1,
      requiresScheduling: input.requiresScheduling ?? true,
      userId,
    },
  })

  revalidatePath('/')
  revalidatePath('/areas')

  return area
}

export async function updateArea(id: string, input: Partial<CreateAreaInput>) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.area.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Area not found')
  }

  const area = await prisma.area.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.requiresScheduling !== undefined && { requiresScheduling: input.requiresScheduling }),
    },
  })

  revalidatePath('/')
  revalidatePath('/areas')
  revalidatePath(`/areas/${id}`)

  return area
}

export async function deleteArea(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.area.findUnique({
    where: { id },
    select: { userId: true, name: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Area not found')
  }

  // Don't allow deleting Inbox
  if (existing.name === 'Inbox') {
    throw new Error('Cannot delete Inbox area')
  }

  await prisma.area.delete({
    where: { id },
  })

  revalidatePath('/')
  revalidatePath('/areas')

  return { success: true }
}

export async function getAreas() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const areas = await prisma.area.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          todos: {
            where: { isCompleted: false },
          },
        },
      },
    },
    orderBy: { order: 'asc' },
  })

  return areas
}

export async function getAreaWithTodos(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const area = await prisma.area.findUnique({
    where: { id },
    include: {
      todos: {
        where: {
          isCompleted: false,
        },
        include: {
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
      },
    },
  })

  if (!area || area.userId !== userId) {
    throw new Error('Area not found')
  }

  return area
}
