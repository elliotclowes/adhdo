import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Navigation } from '@/components/navigation'
import { MobileNav } from '@/components/mobile-nav'
import { AddTaskModal } from '@/components/add-task-modal'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADHDo - Simple Tasks for Focused Minds',
  description: 'An ADHD-friendly todo app that keeps things simple',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
}

type AreaWithCount = {
  id: string
  name: string
  color: string
  _count: { todos: number }
}

type TagWithCount = {
  id: string
  name: string
  color: string
  _count: { todos: number }
}

async function getNavigationData(userId: string): Promise<{
  areas: AreaWithCount[]
  tags: TagWithCount[]
  unsortedCount: number
}> {
  const [areas, tags, unsortedCount] = await Promise.all([
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
    prisma.todo.count({
      where: {
        userId,
        isCompleted: false,
        areaId: null,
        parentId: null,
      },
    }),
  ])

  return { 
    areas: areas as AreaWithCount[], 
    tags: tags as TagWithCount[], 
    unsortedCount 
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // If not authenticated, show children (login page handles its own layout)
  if (!session?.user?.id) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-background antialiased">
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    )
  }

  const { areas, tags, unsortedCount } = await getNavigationData(session.user.id)

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="flex h-screen">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <Navigation
              areas={areas}
              tags={tags}
              unsortedCount={unsortedCount}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>

          {/* Mobile Navigation */}
          <MobileNav unsortedCount={unsortedCount} />
        </div>

        {/* Global Modals */}
        <AddTaskModal
          areas={areas.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
          tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
        />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />
      </body>
    </html>
  )
}
