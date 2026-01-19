import useSWR from 'swr'
import { POLLING_INTERVALS } from '@/lib/swr-config'
import type { TodoWithRelations, Area } from '@/lib/types'

type AreaWithTodos = Area & {
  todos: TodoWithRelations[]
}

export function useArea(id: string | null, fallbackData?: AreaWithTodos) {
  const { data, error, isLoading, mutate } = useSWR<AreaWithTodos>(
    id ? `/api/areas/${id}` : null,
    {
      fallbackData,
      refreshInterval: POLLING_INTERVALS.FAST,
      revalidateOnMount: !fallbackData,
    }
  )

  return {
    area: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
