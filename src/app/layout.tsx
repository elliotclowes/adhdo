import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import NextTopLoader from 'nextjs-toploader'
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
  icon: string | null
  requiresScheduling: boolean
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
  currentStreak: number
}> {
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
      select: { currentStreak: true },
    }),
  ])

  // Get areas that require scheduling
  const schedulingRequiredAreaIds = areas
    .filter((a: AreaWithCount) => a.requiresScheduling)
    .map((a: AreaWithCount) => a.id)

  // Count unsorted tasks:
  // 1. Tasks with no area at all
  // 2. Tasks in scheduling-required areas without a date/time
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

  return { 
    areas: areas as AreaWithCount[], 
    tags: tags as TagWithCount[], 
    unsortedCount,
    currentStreak: user?.currentStreak ?? 0,
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
          <NextTopLoader 
            color="#6366f1"
            height={3}
            showSpinner={false}
          />
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    )
  }

  const { areas, tags, unsortedCount, currentStreak } = await getNavigationData(session.user.id)

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <NextTopLoader 
          color="#6366f1"
          height={3}
          showSpinner={false}
        />
        <div className="flex h-screen">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <Navigation
              areas={areas}
              tags={tags}
              unsortedCount={unsortedCount}
              currentStreak={currentStreak}
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
