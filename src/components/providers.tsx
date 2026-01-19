'use client'

import { SessionProvider } from 'next-auth/react'
import { SWRProvider } from '@/lib/swr-config'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRProvider>
        {children}
      </SWRProvider>
    </SessionProvider>
  )
}
