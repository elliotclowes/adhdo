import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getZombieTodos } from '@/lib/actions/todos'
import { ZombieContent } from '@/components/zombie-content'
import type { TodoWithRelations } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ZombiePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const todos = await getZombieTodos(5) as TodoWithRelations[]

  return <ZombieContent initialTodos={todos} />
}
