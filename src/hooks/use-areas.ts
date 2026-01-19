import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'

type AreaWithCount = {
  id: string
  name: string
  color: string
  icon: string | null
  order: number
  requiresScheduling: boolean
  _count: { todos: number }
}

export function useAreas(fallbackData?: AreaWithCount[]) {
  const { data, error, isLoading, mutate } = useSWR<AreaWithCount[]>(
    '/api/areas',
    {
      fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !fallbackData, // Don't revalidate on mount if we have fallback data
    }
  )

  return {
    areas: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
