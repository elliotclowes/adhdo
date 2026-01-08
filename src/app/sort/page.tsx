import { redirect } from 'next/navigation'
import { SortAsc, CheckCircle2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getUnsortedTodos } from '@/lib/actions/todos'
import { SortTaskList } from '@/components/sort-task-list'

export const dynamic = 'force-dynamic'

export default async function SortPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { todos, totalCount } = await getUnsortedTodos(5)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <SortAsc className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Sort Tasks</h1>
        <p className="text-muted-foreground mt-2">
          {totalCount > 0 ? (
            <>
              You have <span className="font-medium text-amber-600">{totalCount}</span> tasks without an area.
              Assign them to keep things organized.
            </>
          ) : (
            'All your tasks are sorted!'
          )}
        </p>
      </div>

      {/* Tasks */}
      {totalCount > 0 ? (
        <SortTaskList initialTodos={todos} totalCount={totalCount} />
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-foreground font-medium">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Every task has been assigned to an area
          </p>
        </div>
      )}
    </div>
  )
}
