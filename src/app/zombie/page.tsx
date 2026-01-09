import { redirect } from 'next/navigation'
import { Ghost, RefreshCw } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getZombieTodos } from '@/lib/actions/todos'
import { TaskCard } from '@/components/task-card'
import { ZombieRefresh } from '@/components/zombie-refresh'
import type { TodoWithRelations } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ZombiePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const todos = await getZombieTodos(5)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ghost className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Zombie Mode</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Low energy day? Here are some easier tasks you can tackle. 
          We&apos;ve avoided difficult or time-consuming ones.
        </p>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center mb-6">
        <ZombieRefresh />
      </div>

      {/* Tasks */}
      {todos.length > 0 ? (
        <div className="space-y-3">
          {todos.map((todo) => (
            <TaskCard key={todo.id} todo={todo as TodoWithRelations} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Ghost className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No tasks available for zombie mode</p>
          <p className="text-sm text-muted-foreground mt-1">
            All your tasks are either Vital priority or already done!
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How zombie mode works:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Excludes Vital priority tasks (those need your full attention)</li>
          <li>Prefers tasks due sooner</li>
          <li>Avoids tasks with long durations</li>
          <li>Randomly picks from what&apos;s left</li>
        </ul>
      </div>
    </div>
  )
}
