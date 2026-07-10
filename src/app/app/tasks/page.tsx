import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] || 'زميلي'
  
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير'

  const { data: tasks } = await supabase
    .from('outreach_tasks')
    .select(`
      *,
      instagram_accounts ( username, business_name, niche, country )
    `)
    .eq('assigned_to', user.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('assignment_date', { ascending: true, nullsFirst: false })

  const allTasks = tasks || []

  const todayTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.task_type === 'initial')
  const followUpTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.task_type === 'follow_up' && new Date(t.due_date || t.assignment_date) <= new Date())
  const completedTasks = allTasks.filter(t => t.status === 'completed')

  const countryOrder: Record<string, number> = { 'JO': 1, 'SA': 2, 'AE': 3 }
  const sortByCountry = (a: any, b: any) => {
    const orderA = countryOrder[a.instagram_accounts?.country] || 99
    const orderB = countryOrder[b.instagram_accounts?.country] || 99
    return orderA - orderB
  }

  todayTasks.sort(sortByCountry)
  followUpTasks.sort(sortByCountry)

  const totalActive = todayTasks.length + followUpTasks.length
  const progress = totalActive === 0 && completedTasks.length > 0 ? 100 : totalActive === 0 ? 0 : (completedTasks.length / (completedTasks.length + totalActive)) * 100

  const todayStr = new Date().toISOString().split('T')[0]
  const { data: pointsData } = await supabase
    .from('points_ledger')
    .select('points')
    .eq('user_id', user.id)
    .gte('created_at', todayStr)
  
  const todayPoints = pointsData?.reduce((acc, curr) => acc + curr.points, 0) || 0

  const currentTab = tab || 'today'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{greeting}، {firstName}</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</p>
        </div>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">نسبة الإنجاز</p>
                <p className="text-xl font-bold text-foreground">أنجزت {completedTasks.length} من {completedTasks.length + totalActive}</p>
              </div>
              <div className="text-primary font-bold">{Math.round(progress)}%</div>
            </div>
            <Progress value={progress} className="h-2.5 bg-muted" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">متبقي اليوم</p>
              <p className="text-lg font-bold text-foreground">{todayTasks.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">متابعات مستحقة</p>
              <p className="text-lg font-bold text-foreground">{followUpTasks.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">نقاطي</p>
              <p className="text-lg font-bold text-success">{todayPoints}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <Link href="?tab=today" className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${currentTab === 'today' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            اليوم {todayTasks.length > 0 && <span className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 mr-1">{todayTasks.length}</span>}
          </Link>
          <Link href="?tab=followups" className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${currentTab === 'followups' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            المتابعات {followUpTasks.length > 0 && <span className="inline-flex items-center justify-center bg-warning text-warning-foreground text-[10px] rounded-full h-4 w-4 mr-1">{followUpTasks.length}</span>}
          </Link>
          <Link href="?tab=completed" className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${currentTab === 'completed' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            مكتملة
          </Link>
        </div>

        {/* Tab Content */}
        <div>
          {currentTab === 'today' && (
            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-lg border border-border">
                  شغلك لليوم مكتمل.
                </div>
              ) : (
                todayTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          )}

          {currentTab === 'followups' && (
            <div className="space-y-3">
              {followUpTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-lg border border-border">
                  ما عندك متابعات مستحقة.
                </div>
              ) : (
                followUpTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          )}

          {currentTab === 'completed' && (
            <div className="space-y-3">
              {completedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-lg border border-border">
                  لم تنجز أي مهام بعد.
                </div>
              ) : (
                completedTasks.slice(0, 20).map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: any }) {
  const acc = task.instagram_accounts || {}
  const isCompleted = task.status === 'completed'
  const isFollowUp = task.task_type === 'follow_up'
  const isOverdue = !isCompleted && new Date(task.due_date || task.assignment_date) < new Date(new Date().setHours(0,0,0,0))
  
  const getFlag = (country: string) => {
    switch (country) {
      case 'JO': return '🇯🇴'
      case 'SA': return '🇸🇦'
      case 'AE': return '🇦🇪'
      default: return '🌐'
    }
  }

  return (
    <Link href={`/app/tasks/${task.id}`}>
      <Card className="bg-card shadow-sm border-border hover:border-primary/50 transition-colors active:scale-[0.99]">
        <CardContent className="p-4 flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${isFollowUp ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                {isFollowUp ? 'متابعة' : 'تواصل أولي'}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {getFlag(acc.country)} {acc.country || 'مجهول'}
              </span>
              {isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> متأخرة
                </span>
              )}
            </div>
            <h3 className="font-bold text-foreground text-base leading-tight mt-1">{acc.business_name || acc.username || 'حساب غير معروف'}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground dir-ltr text-right">@{acc.username || 'unknown'}</span>
              {acc.niche && <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded">{acc.niche}</span>}
            </div>
          </div>
          <div className="shrink-0 mr-4">
            {isCompleted ? (
              <div className="text-success text-sm flex flex-col items-center gap-1 font-medium">
                <CheckCircle2 className="w-6 h-6" />
                مكتمل
              </div>
            ) : (
              <div className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors">
                فتح المهمة
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
