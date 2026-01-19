import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const { id } = await params

  const area = await prisma.area.findUnique({
    where: { id },
    include: {
      todos: {
        where: {
          isCompleted: false,
        },
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
      },
    },
  })

  if (!area || area.userId !== userId) {
    return NextResponse.json({ error: 'Area not found' }, { status: 404 })
  }

  return NextResponse.json(area)
}
