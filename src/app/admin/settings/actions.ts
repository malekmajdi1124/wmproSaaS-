'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const followup_delay_days = parseInt(formData.get('followup_delay_days') as string)
  const initial_task_points = parseInt(formData.get('initial_task_points') as string)
  const follow_up_points = parseInt(formData.get('follow_up_points') as string)
  const meeting_points = parseInt(formData.get('meeting_points') as string)
  
  const templateJO = formData.get('template_jo') as string
  const templateSA = formData.get('template_sa') as string
  const templateAE = formData.get('template_ae') as string

  const follow_up_templates = {
    JO: templateJO,
    SA: templateSA,
    AE: templateAE
  }

  const { error } = await supabase
    .from('system_settings')
    .update({
      followup_delay_days,
      initial_task_points,
      follow_up_points,
      meeting_points,
      follow_up_templates,
      updated_by: user.id
    })
    .eq('id', 1)

  if (error) {
    return { error: 'حدث خطأ أثناء حفظ الإعدادات: ' + error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function resetSystem() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // Since Supabase RPC or direct deletes can be used. We'll do direct deletes in reverse dependency order.
  // We can't TRUNCATE via REST API, but we can DELETE without WHERE to delete all.
  
  await supabase.from('audit_events').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all
  await supabase.from('points_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('outreach_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('instagram_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('import_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  await supabase.from('audit_events').insert({
    actor_id: user.id,
    event_type: 'system_reset',
    entity_type: 'system_settings',
    entity_id: '00000000-0000-0000-0000-000000000000'
  })

  return { success: true }
}
