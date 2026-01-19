import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUnsortedTodos } from '@/lib/actions/todos'
import { getAreas } from '@/lib/actions/areas'
import { SortContent } from '@/components/sort-content'

export const dynamic = 'force-dynamic'

export default async function SortPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const [unsortedData, areas] = await Promise.all([
    getUnsortedTodos(10),
    getAreas(),
  ])

  return (
    <SortContent
      initialData={unsortedData}
      initialAreas={areas.map((a: { id: string; name: string; color: string; icon: string | null; requiresScheduling: boolean }) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        icon: a.icon,
        requiresScheduling: a.requiresScheduling,
      }))}
    />
  )
}
