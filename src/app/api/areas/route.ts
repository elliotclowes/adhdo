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

  return NextResponse.json(areas)
}
