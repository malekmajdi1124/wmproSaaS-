import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, Calendar, Users, AlertCircle, Activity } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // General Metrics
  const { data: tasks } = await supabase.from('outreach_tasks').select('id, status, task_type, due_date')
  const { count: meetingsCount } = await supabase.from('meetings').select('*', { count: 'exact', head: true })
  
  const allTasks = tasks || []
  const todayTasks = allTasks.filter(t => t.task_type === 'initial')
  const completedToday = todayTasks.filter(t => t.status === 'completed')
  const completionRate = todayTasks.length > 0 ? Math.round((completedToday.length / todayTasks.length) * 100) : 0
  
  const overdueFollowUps = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.task_type === 'follow_up' && new Date(t.due_date || new Date()) < new Date(new Date().setHours(0,0,0,0)))

  // Team Stats
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role')
  const team = profiles?.filter(p => p.role === 'agent') || []

  // Getting points
  const { data: points } = await supabase.from('points_ledger').select('user_id, points')
  
  const teamStats = team.map(member => {
    const memberTasks = allTasks.filter(t => (t as any).assigned_to === member.id)
    const memberPoints = points?.filter(p => p.user_id === member.id).reduce((a, b) => a + b.points, 0) || 0
    return {
      name: member.full_name,
      assigned: memberTasks.length,
      completed: memberTasks.filter(t => t.status === 'completed').length,
      points: memberPoints
    }
  }).sort((a, b) => b.points - a.points)

  // Fetch recent activity
  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select(`
      id, event_type, created_at, metadata,
      profiles ( full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const formatEvent = (event: any) => {
    const actor = event.profiles?.full_name || 'النظام'
    switch (event.event_type) {
      case 'batch_imported': return `${actor} قام باستيراد دفعة حسابات جديدة`
      case 'batch_deleted': return `${actor} قام بمسح دفعة حسابات`
      case 'system_reset': return `${actor} قام بإعادة ضبط المصنع ومسح البيانات`
      case 'task_completed': return `${actor} أنجز مهمة تواصل`
      case 'meeting_created': return `${actor} حجز اجتماعاً جديداً`
      case 'user_deactivated': return `${actor} قام بإيقاف حساب موظف`
      case 'user_activated': return `${actor} قام بتفعيل حساب موظف`
      case 'task_reassigned': return `${actor} قام بإعادة تعيين مهمة`
      default: return `${actor} أجرى تعديلاً (${event.event_type})`
    }
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    return `منذ ${Math.floor(diffHours / 24)} يوم`
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">نظرة عامة</h1>
        <p className="text-muted-foreground text-sm">مؤشرات الأداء التشغيلية للفريق</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">مهام اليوم</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">{todayTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">مكتمل: {completedToday.length} ({completionRate}%)</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">متابعات متأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">{overdueFollowUps.length}</div>
            <p className="text-xs text-destructive mt-1 font-medium">تتطلب انتباهاً</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">الاجتماعات</CardTitle>
            <Calendar className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">{meetingsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">إجمالي المحجوزة</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">الفريق المتاح</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">{team.length}</div>
            <p className="text-xs text-muted-foreground mt-1">موظفين نشطين</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Team Table */}
        <Card className="lg:col-span-2 bg-card border-border shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 p-5">
            <CardTitle className="text-lg">أداء الموظفين</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-medium">الاسم</th>
                  <th className="px-5 py-3 font-medium">المهام المسندة</th>
                  <th className="px-5 py-3 font-medium">المنجزة</th>
                  <th className="px-5 py-3 font-medium">النقاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamStats.map((member, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{member.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{member.assigned}</td>
                    <td className="px-5 py-4 text-muted-foreground">{member.completed}</td>
                    <td className="px-5 py-4 font-bold text-success">{member.points}</td>
                  </tr>
                ))}
                {teamStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">لا يوجد موظفين نشطين حالياً</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="border-b border-border bg-muted/30 p-5 shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> آخر النشاطات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-border">
              {auditEvents && auditEvents.length > 0 ? (
                auditEvents.map(event => (
                  <div key={event.id} className="p-4 flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{formatEvent(event)}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(event.created_at)}</p>
                  </div>
                ))
              ) : (
                <div className="p-5 text-sm text-muted-foreground text-center py-12">
                  لا يوجد نشاطات مسجلة بعد
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
