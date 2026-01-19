import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations } from '@/lib/types'

interface UseScheduleOptions {
  fallbackData?: Record<string, TodoWithRelations[]>
}

export function useSchedule(options: UseScheduleOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<Record<string, TodoWithRelations[]>>(
    '/api/schedule',
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    todos: data ?? {},
    isLoading,
    isError: !!error,
    mutate,
  }
}
