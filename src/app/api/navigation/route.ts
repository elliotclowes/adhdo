import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [areas, tags, user] = await Promise.all([
    prisma.area.findMany({
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
    }),
    prisma.tag.findMany({
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
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    }),
  ])

  // Get areas that require scheduling
  const schedulingRequiredAreaIds = areas
    .filter((a) => a.requiresScheduling)
    .map((a) => a.id)

  // Count unsorted tasks
  const [noAreaCount, needsSchedulingCount] = await Promise.all([
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        areaId: null,
        parentId: null,
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
  ])

  const unsortedCount = noAreaCount + needsSchedulingCount

  return NextResponse.json({
    areas,
    tags,
    unsortedCount,
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
  })
}
