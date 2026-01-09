'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  Ghost,
  MoreHorizontal,
  Plus,
  Settings,
  SortAsc,
  Tag,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface MobileNavProps {
  unsortedCount: number
  areas?: { id: string; name: string; color: string; _count: { todos: number } }[]
}

export function MobileNav({ unsortedCount, areas = [] }: MobileNavProps) {
  const pathname = usePathname()
  const { setAddTaskModalOpen, setEditingTodo } = useAppStore()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const moreMenuItems = [
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/tags', label: 'Tags', icon: Tag },
    { href: '/zombie', label: 'Zombie Mode', icon: Ghost },
    { href: '/completed', label: 'Completed', icon: CheckCircle2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More Menu Sheet */}
      {showMoreMenu && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-card border-t rounded-t-2xl z-50 md:hidden animate-in slide-in-from-bottom duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">More</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 hover:bg-muted rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t safe-bottom md:hidden z-40">
        <div className="flex items-center justify-around px-2 py-1">
          {/* Today */}
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
              pathname === '/'
                ? 'text-primary'
                : 'text-muted-foreground active:bg-muted'
            )}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Today</span>
          </Link>

          {/* Areas */}
          <Link
            href="/areas"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
              pathname.startsWith('/areas')
                ? 'text-primary'
                : 'text-muted-foreground active:bg-muted'
            )}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-xs">Areas</span>
          </Link>

          {/* Center Add Button */}
          <button
            onClick={() => {
              setEditingTodo(null)
              setAddTaskModalOpen(true)
            }}
            className="flex flex-col items-center gap-1 px-3 py-2 -mt-4 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6" />
            </div>
          </button>

          {/* Sort */}
          <Link
            href="/sort"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative min-w-[60px]',
              pathname === '/sort'
                ? 'text-primary'
                : 'text-muted-foreground active:bg-muted'
            )}
          >
            <SortAsc className="w-5 h-5" />
            <span className="text-xs">Sort</span>
            {unsortedCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unsortedCount > 9 ? '9+' : unsortedCount}
              </span>
            )}
          </Link>

          {/* More */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
              showMoreMenu
                ? 'text-primary'
                : 'text-muted-foreground active:bg-muted'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-xs">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
