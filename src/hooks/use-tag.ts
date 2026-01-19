import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations } from '@/lib/types'

interface TagData {
  id: string
  name: string
  color: string
  todos: { todo: TodoWithRelations }[]
}

interface UseTagOptions {
  fallbackData?: TagData
}

export function useTag(tagId: string, options: UseTagOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<TagData>(
    tagId ? `/api/tags/${tagId}` : null,
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    tag: data,
    todos: data?.todos.map(t => t.todo) ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
