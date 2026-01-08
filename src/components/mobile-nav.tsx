'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  CalendarDays,
  Ghost,
  Plus,
  SortAsc,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface MobileNavProps {
  unsortedCount: number
}

export function MobileNav({ unsortedCount }: MobileNavProps) {
  const pathname = usePathname()
  const setAddTaskModalOpen = useAppStore((state) => state.setAddTaskModalOpen)

  const links = [
    { href: '/', label: 'Today', icon: Calendar },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/zombie', label: 'Zombie', icon: Ghost },
    {
      href: '/sort',
      label: 'Sort',
      icon: SortAsc,
      badge: unsortedCount > 0 ? unsortedCount : undefined,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t safe-bottom md:hidden z-40">
      <div className="flex items-center justify-around px-2 py-1">
        {links.slice(0, 2).map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{link.label}</span>
            </Link>
          )
        })}

        {/* Center Add Button */}
        <button
          onClick={() => setAddTaskModalOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-2 -mt-4"
        >
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6" />
          </div>
        </button>

        {links.slice(2).map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{link.label}</span>
              {link.badge && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
