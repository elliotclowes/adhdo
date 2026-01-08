import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeLeft(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff < 0) {
    return 'Overdue'
  }
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  
  if (weeks > 0) {
    return `${weeks}w left`
  }
  if (days > 0) {
    return `${days}d left`
  }
  if (hours > 0) {
    return `${hours}h left`
  }
  if (minutes > 0) {
    return `${minutes}m left`
  }
  return 'Due now'
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'Vital'
    case 2:
      return 'Important'
    case 3:
      return 'Not Important'
    case 4:
      return 'Someday'
    default:
      return 'Not Important'
  }
}

export function getPriorityClass(priority: number): string {
  switch (priority) {
    case 1:
      return 'priority-vital'
    case 2:
      return 'priority-important'
    case 3:
      return 'priority-normal'
    case 4:
      return 'priority-someday'
    default:
      return 'priority-normal'
  }
}

export function getPriorityDotClass(priority: number): string {
  switch (priority) {
    case 1:
      return 'priority-dot-vital'
    case 2:
      return 'priority-dot-important'
    case 3:
      return 'priority-dot-normal'
    case 4:
      return 'priority-dot-someday'
    default:
      return 'priority-dot-normal'
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
