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
    const limit = parseInt(searchParams.get('limit') || '5')

    // Get easy tasks for zombie mode
    // Excludes Vital (priority 1), prefers lower priority and shorter duration
    const todos = await prisma.todo.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        priority: { not: 1 }, // Exclude Vital
        OR: [
          { duration: null },
          { duration: { lte: 60 } }, // Max 60 min duration
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
      orderBy: [
        { scheduledDate: 'asc' },
        { priority: 'desc' }, // Lower priority first (4 = Someday, 3 = Not Important)
      ],
      take: limit * 3, // Get more than needed for randomization
    })

    // Shuffle and take the requested limit
    const shuffled = todos.sort(() => Math.random() - 0.5)
    const result = shuffled.slice(0, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching zombie todos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
