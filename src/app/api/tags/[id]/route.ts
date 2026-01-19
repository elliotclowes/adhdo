import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tag = await prisma.tag.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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
                children: {
                  include: {
                    children: true,
                    tags: { include: { tag: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Error fetching tag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
