'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Prevent admin from deactivating themselves
  if (userId === user.id) {
    return { error: 'لا يمكنك إيقاف حسابك الخاص' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: !currentStatus })
    .eq('id', userId)

  if (error) {
    return { error: 'فشل في تحديث حالة الحساب: ' + error.message }
  }

  await supabase.from('audit_events').insert({
    actor_id: user.id,
    event_type: currentStatus ? 'user_deactivated' : 'user_activated',
    entity_type: 'profiles',
    entity_id: userId
  })

  revalidatePath('/admin/team')
  return { success: true }
}
