import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Tasks needing both area and datetime (in areas that require scheduling)
    const needsAreaAndDateTime = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        parentId: null,
        OR: [
          { areaId: null },
          {
            area: {
              requiresScheduling: true,
            },
            scheduledDate: null,
          },
        ],
        AND: [
          { areaId: null },
        ],
      },
      include: {
        area: true,
        tags: { include: { tag: true } },
        children: {
          include: {
            children: true,
            tags: { include: { tag: true } },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })

    // Tasks with area but needing datetime (in areas that require scheduling)
    const needsDateTime = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        parentId: null,
        areaId: { not: null },
        scheduledDate: null,
        area: {
          requiresScheduling: true,
        },
      },
      include: {
        area: true,
        tags: { include: { tag: true } },
        children: {
          include: {
            children: true,
            tags: { include: { tag: true } },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })

    // Tasks needing area (but have datetime or area doesn't require scheduling)
    const needsArea = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        parentId: null,
        areaId: null,
        scheduledDate: { not: null },
      },
      include: {
        area: true,
        tags: { include: { tag: true } },
        children: {
          include: {
            children: true,
            tags: { include: { tag: true } },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })

    // Get counts
    const [needsAreaAndDateTimeCount, needsDateTimeCount, needsAreaCount] = await Promise.all([
      prisma.todo.count({
        where: {
          userId: session.user.id,
          isCompleted: false,
          parentId: null,
          areaId: null,
        },
      }),
      prisma.todo.count({
        where: {
          userId: session.user.id,
          isCompleted: false,
          parentId: null,
          areaId: { not: null },
          scheduledDate: null,
          area: {
            requiresScheduling: true,
          },
        },
      }),
      prisma.todo.count({
        where: {
          userId: session.user.id,
          isCompleted: false,
          parentId: null,
          areaId: null,
          scheduledDate: { not: null },
        },
      }),
    ])

    const totalCount = needsAreaAndDateTimeCount + needsDateTimeCount + needsAreaCount

    return NextResponse.json({
      needsAreaAndDateTime,
      needsDateTime,
      needsArea,
      needsAreaAndDateTimeCount,
      needsDateTimeCount,
      needsAreaCount,
      totalCount,
    })
  } catch (error) {
    console.error('Error fetching sort data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
