'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Ghost,
  LayoutGrid,
  Plus,
  Settings,
  SortAsc,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useAppStore } from '@/lib/store'
import { useNavigation } from '@/hooks/use-navigation'

interface NavigationProps {
  areas: { id: string; name: string; color: string; icon: string | null; requiresScheduling?: boolean; _count: { todos: number } }[]
  tags: { id: string; name: string; color: string; _count: { todos: number } }[]
  unsortedCount: number
  currentStreak?: number
}

export function Navigation({ areas: initialAreas, tags: initialTags, unsortedCount: initialUnsortedCount, currentStreak: initialStreak = 0 }: NavigationProps) {
  const pathname = usePathname()
  const { setAddTaskModalOpen, setEditingTodo } = useAppStore()

  // Use SWR for real-time navigation data updates
  const {
    areas: swrAreas,
    tags: swrTags,
    unsortedCount: swrUnsortedCount,
    currentStreak: swrCurrentStreak,
  } = useNavigation({
    fallbackData: {
      areas: initialAreas.map(a => ({ ...a, requiresScheduling: a.requiresScheduling ?? true })),
      tags: initialTags,
      unsortedCount: initialUnsortedCount,
      currentStreak: initialStreak,
      longestStreak: 0,
    },
  })

  // Use SWR data (with fallback to initial props)
  const areas = swrAreas.length > 0 ? swrAreas : initialAreas
  const tags = swrTags.length > 0 ? swrTags : initialTags
  const unsortedCount = swrUnsortedCount
  const currentStreak = swrCurrentStreak

  const mainLinks = [
    { href: '/', label: 'Today', icon: Calendar },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/zombie', label: 'Zombie Mode', icon: Ghost },
    {
      href: '/sort',
      label: 'Sort',
      icon: SortAsc,
      badge: unsortedCount > 0 ? unsortedCount : undefined,
    },
    { href: '/completed', label: 'Completed', icon: CheckCircle2 },
  ]

  return (
    <nav className="w-64 h-full bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">✦</span>
          <span className="font-semibold text-lg">ADHDo</span>
        </Link>
      </div>

      {/* Add Task Button */}
      <div className="p-4">
        <Button
          onClick={() => {
            setEditingTodo(null)
            setAddTaskModalOpen(true)
          }}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Task
          <kbd className="ml-auto text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">
            Q
          </kbd>
        </Button>
      </div>

      {/* Streak Display */}
      {currentStreak > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <span className="text-lg">🔥</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-900 dark:text-orange-100">
                {currentStreak} day streak
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-300">
                Keep it going!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Links */}
      <div className="px-2 py-2">
        {mainLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{link.label}</span>
              {link.badge && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Areas */}
      <div className="px-2 py-2">
        <div className="flex items-center justify-between px-3 py-2">
          <Link
            href="/areas"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Areas
          </Link>
          <Link
            href="/areas"
            className="text-muted-foreground hover:text-foreground"
          >
            <LayoutGrid className="w-4 h-4" />
          </Link>
        </div>
        {areas.map((area) => {
          const isActive = pathname === `/areas/${area.id}`
          return (
            <Link
              key={area.id}
              href={`/areas/${area.id}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span className="w-4 text-center">{area.icon || '📁'}</span>
              <span className="flex-1 truncate">{area.name}</span>
              {area._count.todos > 0 && (
                <span className="text-xs text-muted-foreground">
                  {area._count.todos}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Tags */}
      <div className="px-2 py-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <Link
            href="/tags"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            Tags
          </Link>
          <Link
            href="/tags"
            className="text-muted-foreground hover:text-foreground"
          >
            <Tag className="w-4 h-4" />
          </Link>
        </div>
        {tags.map((tag) => {
          const isActive = pathname === `/tags/${tag.id}`
          return (
            <Link
              key={tag.id}
              href={`/tags/${tag.id}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 truncate">{tag.name}</span>
              {tag._count.todos > 0 && (
                <span className="text-xs text-muted-foreground">
                  {tag._count.todos}
                </span>
              )}
            </Link>
          )
        })}
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">
            No tags yet
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="p-2 border-t">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </nav>
  )
}
