import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAreaWithTodos } from '@/lib/actions/areas'
import { AreaContent } from '@/components/area-content'

interface AreaPageProps {
  params: Promise<{ id: string }>
}

export default async function AreaPage({ params }: AreaPageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  let area
  try {
    area = await getAreaWithTodos(id)
  } catch {
    notFound()
  }

  // Pass to client component for real-time updates
  return <AreaContent initialArea={area} />
}
