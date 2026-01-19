'use client'

import { SWRConfig } from 'swr'

// Global fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

interface SWRProviderProps {
  children: React.ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  )
}

// Polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  FAST: 5000,    // 5 seconds - for tasks and areas
  MEDIUM: 10000, // 10 seconds - for navigation data
  SLOW: 30000,   // 30 seconds - for less critical data
} as const
