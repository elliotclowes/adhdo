import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations } from '@/lib/types'

interface UseZombieOptions {
  limit?: number
  fallbackData?: TodoWithRelations[]
}

export function useZombieTodos(options: UseZombieOptions = {}) {
  const limit = options.limit ?? 5

  const { data, error, isLoading, mutate } = useSWR<TodoWithRelations[]>(
    `/api/zombie?limit=${limit}`,
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
    refresh: () => mutate(),
  }
}
