import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InactivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-red-900/50 bg-black/40 backdrop-blur-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-red-950/50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-xl text-white">حسابك غير مفعّل</CardTitle>
          <CardDescription className="text-zinc-400">
            عذراً، لا يمكنك الوصول إلى النظام حالياً. يرجى مراجعة الإدارة لتفعيل حسابك.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-2">
          <form action={logout}>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
              تسجيل الخروج
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
