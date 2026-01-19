import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations } from '@/lib/types'

interface SortData {
  needsAreaAndDateTime: TodoWithRelations[]
  needsDateTime: TodoWithRelations[]
  needsArea: TodoWithRelations[]
  needsAreaAndDateTimeCount: number
  needsDateTimeCount: number
  needsAreaCount: number
  totalCount: number
}

interface UseSortOptions {
  limit?: number
  fallbackData?: SortData
}

export function useSort(options: UseSortOptions = {}) {
  const limit = options.limit ?? 10

  const { data, error, isLoading, mutate } = useSWR<SortData>(
    `/api/sort?limit=${limit}`,
    {
      fallbackData: options.fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !options.fallbackData,
    }
  )

  return {
    needsAreaAndDateTime: data?.needsAreaAndDateTime ?? [],
    needsDateTime: data?.needsDateTime ?? [],
    needsArea: data?.needsArea ?? [],
    needsAreaAndDateTimeCount: data?.needsAreaAndDateTimeCount ?? 0,
    needsDateTimeCount: data?.needsDateTimeCount ?? 0,
    needsAreaCount: data?.needsAreaCount ?? 0,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  }
}
