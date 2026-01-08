'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function KeyboardShortcuts() {
  const { setAddTaskModalOpen, setEditingTodo } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // 'q' to quick add task
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        setEditingTodo(null)
        setAddTaskModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setAddTaskModalOpen, setEditingTodo])

  return null
}
