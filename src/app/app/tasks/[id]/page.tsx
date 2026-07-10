import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TaskExecution from './TaskExecution'

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
  
  const { id } = await params;

  const { data: task, error } = await supabase
    .from('outreach_tasks')
    .select(`
      *,
      instagram_accounts (*)
    `)
    .eq('id', id)
    .single()

  if (error || !task) {
    notFound()
  }

  if (task.assigned_to !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      redirect('/app/tasks')
    }
  }

  const { data: allActiveTasks } = await supabase
    .from('outreach_tasks')
    .select(`
      id,
      task_type,
      assignment_date,
      due_date,
      instagram_accounts!inner ( country )
    `)
    .eq('assigned_to', user.id)
    .eq('task_type', task.task_type)
    .neq('status', 'completed')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('assignment_date', { ascending: true, nullsFirst: false })

  let nextTaskId = null
  if (allActiveTasks && allActiveTasks.length > 0) {
    const validTasks = allActiveTasks.filter(t => {
      if (t.task_type === 'follow_up') {
        return new Date(t.due_date || t.assignment_date) <= new Date()
      }
      return true
    })

    const countryOrder: Record<string, number> = { 'JO': 1, 'SA': 2, 'AE': 3 }
    const sortedTasks = validTasks.sort((a: any, b: any) => {
      const orderA = countryOrder[a.instagram_accounts?.country] || 99
      const orderB = countryOrder[b.instagram_accounts?.country] || 99
      return orderA - orderB
    })
    
    // Find the first task in the sorted list that is NOT the current task
    const nextTask = sortedTasks.find(t => t.id !== id)
    if (nextTask) {
      nextTaskId = nextTask.id
    }
  }

  return (
    <div className="p-4 md:p-8">
      <TaskExecution task={task} account={task.instagram_accounts} nextTaskId={nextTaskId} />
    </div>
  )
}
