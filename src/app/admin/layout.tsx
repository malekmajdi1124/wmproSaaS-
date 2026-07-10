import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Upload, LayoutDashboard, Settings, LogOut, CheckSquare, Calendar, ShieldAlert } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role !== 'admin') redirect('/app/tasks')

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-l border-border shrink-0 md:h-screen sticky top-0 flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 font-bold text-xl tracking-tight border-b border-border flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm tracking-tighter">WMP</span>
            </div>
            <span className="text-foreground leading-none">الإدارة</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-destructive/10 text-destructive text-[10px] font-bold px-2.5 py-1 rounded-md w-fit border border-destructive/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Active Role: Admin
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto flex md:flex-col gap-2 md:gap-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap">
            <LayoutDashboard size={20} className="shrink-0" /> <span className="hidden md:inline">نظرة عامة</span>
          </Link>
          <Link href="/admin/import" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap">
            <Upload size={20} className="shrink-0" /> <span className="hidden md:inline">استيراد الحسابات</span>
          </Link>
          <Link href="/admin/tasks" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap hidden sm:flex">
            <CheckSquare size={20} className="shrink-0" /> <span className="hidden md:inline">المهام</span>
          </Link>
          <Link href="/admin/meetings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap hidden sm:flex">
            <Calendar size={20} className="shrink-0" /> <span className="hidden md:inline">الاجتماعات</span>
          </Link>
          <Link href="/admin/team" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap hidden sm:flex">
            <Users size={20} className="shrink-0" /> <span className="hidden md:inline">الفريق</span>
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium whitespace-nowrap hidden sm:flex">
            <Settings size={20} className="shrink-0" /> <span className="hidden md:inline">الإعدادات</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border hidden md:block">
          <form action={async () => {
            'use server'
            const sb = await createClient()
            await sb.auth.signOut()
            redirect('/login')
          }}>
            <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-medium">
              <LogOut size={20} /> تسجيل خروج
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  )
}
