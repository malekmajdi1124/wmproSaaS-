import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckSquare, Calendar, LogOut } from 'lucide-react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] || 'زميلي'

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold text-sm tracking-tighter">WMP</span>
          </div>
          <span className="font-semibold text-foreground">أهلاً، {firstName}</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-l border-border shrink-0 min-h-screen sticky top-0 flex-col">
        <div className="p-6 font-bold text-xl tracking-tight border-b border-border text-foreground flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold text-sm tracking-tighter">WMP</span>
          </div>
          مركز المهام
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/app/tasks" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium">
            <CheckSquare size={20} /> المهام
          </Link>
          <Link href="/app/meetings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-medium">
            <Calendar size={20} /> الاجتماعات
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
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
      <main className="flex-1 overflow-y-auto pb-[70px] md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border flex z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link href="/app/tasks" className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none">
          <CheckSquare size={24} className="mb-1" />
          <span className="text-[11px] font-medium">المهام</span>
        </Link>
        <Link href="/app/meetings" className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none">
          <Calendar size={24} className="mb-1" />
          <span className="text-[11px] font-medium">الاجتماعات</span>
        </Link>
        <form action={async () => {
            'use server'
            const sb = await createClient()
            await sb.auth.signOut()
            redirect('/login')
          }} className="flex-1 flex">
          <button className="w-full flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-destructive transition-colors focus:outline-none">
            <LogOut size={24} className="mb-1" />
            <span className="text-[11px] font-medium">خروج</span>
          </button>
        </form>
      </nav>
      
    </div>
  )
}
