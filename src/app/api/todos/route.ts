import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(request.url)

  // Filter parameters
  const view = searchParams.get('view') // 'today' | 'schedule' | 'overdue' | 'all'
  const areaId = searchParams.get('areaId')
  const tagId = searchParams.get('tagId')
  const days = searchParams.get('days') // For schedule view (1, 3, 7)
  const includeCompleted = searchParams.get('includeCompleted') === 'true'

  // Get user timezone
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })
  const timezone = user?.timezone || 'UTC'

  // Build where clause dynamically based on filters
  // eslint-disable-next-line
  const where: any = {
    userId,
    parentId: null, // Only get parent tasks (children are included via relation)
  }

  if (!includeCompleted) {
    where.isCompleted = false
  }

  // Date filtering for today/schedule/overdue views
  if (view === 'today') {
    const now = new Date()
    const nowInUserTz = toZonedTime(now, timezone)
    const todayStart = startOfDay(nowInUserTz)
    const todayEnd = endOfDay(nowInUserTz)

    where.scheduledDate = {
      gte: fromZonedTime(todayStart, timezone),
      lte: fromZonedTime(todayEnd, timezone),
    }
  } else if (view === 'overdue') {
    const now = new Date()
    const nowInUserTz = toZonedTime(now, timezone)
    const todayStart = startOfDay(nowInUserTz)

    where.scheduledDate = {
      lt: fromZonedTime(todayStart, timezone),
    }
  } else if (view === 'schedule' && days) {
    const numDays = parseInt(days, 10)
    const now = new Date()
    const nowInUserTz = toZonedTime(now, timezone)
    const start = startOfDay(nowInUserTz)
    const end = endOfDay(addDays(nowInUserTz, numDays - 1))

    where.scheduledDate = {
      gte: fromZonedTime(start, timezone),
      lte: fromZonedTime(end, timezone),
    }
  }

  // Area filtering
  if (areaId) {
    where.areaId = areaId
  }

  // Tag filtering
  if (tagId) {
    where.tags = {
      some: {
        tagId: tagId,
      },
    }
  }

  const todos = await prisma.todo.findMany({
    where,
    include: {
      area: true,
      tags: { include: { tag: true } },
      parent: true,
      children: {
        include: {
          area: true,
          tags: { include: { tag: true } },
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

  return NextResponse.json(todos)
}
