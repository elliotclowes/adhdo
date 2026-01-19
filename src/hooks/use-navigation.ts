import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'

type AreaWithCount = {
  id: string
  name: string
  color: string
  icon: string | null
  requiresScheduling: boolean
  _count: { todos: number }
}

type TagWithCount = {
  id: string
  name: string
  color: string
  _count: { todos: number }
}

interface NavigationData {
  areas: AreaWithCount[]
  tags: TagWithCount[]
  unsortedCount: number
  currentStreak: number
  longestStreak: number
}

interface UseNavigationOptions {
  fallbackData?: NavigationData
}

export function useNavigation(options: UseNavigationOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<NavigationData>(
    '/api/navigation',
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.MEDIUM,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    areas: data?.areas ?? [],
    tags: data?.tags ?? [],
    unsortedCount: data?.unsortedCount ?? 0,
    currentStreak: data?.currentStreak ?? 0,
    longestStreak: data?.longestStreak ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}
