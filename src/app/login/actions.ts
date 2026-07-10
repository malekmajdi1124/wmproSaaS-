'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' }
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'بيانات غير صحيحة' }
      }
      return { error: 'تعذر الاتصال، حاول مرة أخرى' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_active, role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      return { error: 'حدث خطأ في جلب بيانات الحساب' }
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      return { error: 'حسابك غير مفعّل حالياً، راجع الإدارة' }
    }

    revalidatePath('/', 'layout')
    
    if (profile.role === 'admin') {
      return { success: true, redirectUrl: '/admin/dashboard' }
    } else {
      return { success: true, redirectUrl: '/app/tasks' }
    }

  } catch (err) {
    return { error: 'انقطاع اتصال. تأكد من الشبكة وحاول مرة ثانية' }
  }
}
