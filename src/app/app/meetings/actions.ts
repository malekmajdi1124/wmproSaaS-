'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function bookMeetingAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const account_id = formData.get('account_id') as string
  const contact_name = formData.get('contact_name') as string
  const phone = formData.get('phone') as string
  const niche = formData.get('niche') as string
  const scheduled_at = formData.get('scheduled_at') as string
  const notes = formData.get('notes') as string

  if (!account_id || !contact_name || !phone || !scheduled_at) {
    return { error: 'الرجاء تعبئة جميع الحقول المطلوبة' }
  }

  try {
    const { data, error } = await supabase.rpc('book_meeting', {
      p_account_id: account_id,
      p_contact_name: contact_name,
      p_phone: phone,
      p_niche: niche,
      p_scheduled_at: new Date(scheduled_at).toISOString(),
      p_notes: notes,
      p_user_id: user.id
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/app/meetings')
    revalidatePath('/app/tasks')
    
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'حدث خطأ' }
  }
}
