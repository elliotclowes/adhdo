'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { CreateTagInput } from '@/lib/types'

export async function createTag(input: CreateTagInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const tag = await prisma.tag.create({
    data: {
      name: input.name,
      color: input.color ?? '#8b5cf6',
      userId,
    },
  })

  revalidatePath('/')

  return tag
}

export async function updateTag(id: string, input: Partial<CreateTagInput>) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.tag.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Tag not found')
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    },
  })

  revalidatePath('/')
  revalidatePath(`/tags/${id}`)

  return tag
}

export async function deleteTag(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  // Verify ownership
  const existing = await prisma.tag.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!existing || existing.userId !== userId) {
    throw new Error('Tag not found')
  }

  await prisma.tag.delete({
    where: { id },
  })

  revalidatePath('/')

  return { success: true }
}

export async function getTags() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const tags = await prisma.tag.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          todos: {
            where: {
              todo: { isCompleted: false },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return tags
}

export async function getTagWithTodos(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      todos: {
        where: {
          todo: {
            isCompleted: false,
          },
        },
        include: {
          todo: {
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
          },
        },
      },
    },
  })

  if (!tag || tag.userId !== userId) {
    throw new Error('Tag not found')
  }

  return tag
}
