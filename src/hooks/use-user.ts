import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'

interface UserData {
  id: string
  name: string | null
  email: string | null
  dailyTaskLimit: number
  vitalTaskLimit: number | null
  importantTaskLimit: number | null
  notImportantTaskLimit: number | null
  somedayTaskLimit: number | null
  dailySummaryTime: string
  timezone: string
  currentStreak: number
  longestStreak: number
}

interface UseUserOptions {
  fallbackData?: UserData
}

export function useUser(options: UseUserOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<UserData>(
    '/api/user',
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.MEDIUM,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    user: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
