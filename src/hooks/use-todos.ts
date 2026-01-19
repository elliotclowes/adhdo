import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations } from '@/lib/types'

interface UseTodosOptions {
  view?: 'today' | 'schedule' | 'overdue' | 'all'
  areaId?: string
  tagId?: string
  days?: number
  includeCompleted?: boolean
  fallbackData?: TodoWithRelations[]
}

function buildTodosUrl(options: UseTodosOptions): string {
  const params = new URLSearchParams()

  if (options.view) params.set('view', options.view)
  if (options.areaId) params.set('areaId', options.areaId)
  if (options.tagId) params.set('tagId', options.tagId)
  if (options.days) params.set('days', options.days.toString())
  if (options.includeCompleted) params.set('includeCompleted', 'true')

  const queryString = params.toString()
  return queryString ? `/api/todos?${queryString}` : '/api/todos'
}

export function useTodos(options: UseTodosOptions = {}) {
  const url = buildTodosUrl(options)

  const { data, error, isLoading, mutate } = useSWR<TodoWithRelations[]>(
    url,
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    todos: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

// Convenience hooks for common use cases
export function useTodayTodos(fallbackData?: TodoWithRelations[]) {
  return useTodos({ view: 'today', fallbackData })
}

export function useOverdueTodos(fallbackData?: TodoWithRelations[]) {
  return useTodos({ view: 'overdue', fallbackData })
}

export function useScheduleTodos(days: number, fallbackData?: TodoWithRelations[]) {
  return useTodos({ view: 'schedule', days, fallbackData })
}

export function useAreaTodos(areaId: string, fallbackData?: TodoWithRelations[]) {
  return useTodos({ areaId, fallbackData })
}

export function useTagTodos(tagId: string, fallbackData?: TodoWithRelations[]) {
  return useTodos({ tagId, fallbackData })
}
