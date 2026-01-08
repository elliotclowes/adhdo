'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ZombieRefresh() {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleRefresh} className="gap-2">
      <RefreshCw className="w-4 h-4" />
      Shuffle Tasks
    </Button>
  )
}
