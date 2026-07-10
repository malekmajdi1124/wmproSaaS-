'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeTaskAction(taskId: string, isFollowUp: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  try {
    const { data, error } = await supabase.rpc(
      isFollowUp ? 'complete_follow_up_task' : 'complete_initial_task',
      {
        task_id: taskId
      }
    )

    if (error) {
      console.error(error)
      return { error: 'تعذر إكمال المهمة: ' + error.message }
    }

    revalidatePath('/app/tasks')
    revalidatePath(`/app/tasks/${taskId}`)
    
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'حدث خطأ غير متوقع' }
  }
}

export async function updateTaskProgress(taskId: string, field: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  
  if (field === 'opened') updates.profile_opened_at = new Date().toISOString()
  if (field === 'confirmed') updates.follow_confirmed = true
  if (field === 'msg1') updates.message_1_copied_at = new Date().toISOString()
  if (field === 'msg2') updates.message_2_copied_at = new Date().toISOString()

  const { error } = await supabase
    .from('outreach_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('assigned_to', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/app/tasks/${taskId}`)
  return { success: true }
}
