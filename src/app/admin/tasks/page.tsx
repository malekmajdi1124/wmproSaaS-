'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckSquare, Clock, User, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function TasksPage() {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('outreach_tasks')
      .select('*, instagram_accounts(username, country), profiles!outreach_tasks_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (data) {
      setTasks(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          متابعة المهام
        </h1>
        <p className="text-muted-foreground text-sm">عرض آخر 100 مهمة تواصل وتتبع أدائها</p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border p-5">
          <CardTitle className="text-lg">سجل المهام (Outreach Tasks)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">الحساب</th>
                  <th className="px-6 py-4 font-bold">الدولة</th>
                  <th className="px-6 py-4 font-bold">نوع المهمة</th>
                  <th className="px-6 py-4 font-bold">تاريخ الإسناد</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الموظف المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground dir-ltr text-right">
                      @{task.instagram_accounts?.username}
                    </td>
                    <td className="px-6 py-4">
                      {task.instagram_accounts?.country}
                    </td>
                    <td className="px-6 py-4">
                      {task.task_type === 'initial' ? (
                        <span className="text-primary font-bold">تواصل أول</span>
                      ) : (
                        <span className="text-accent-foreground font-bold">متابعة (Follow up)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground" dir="ltr">
                      {new Date(task.assignment_date || task.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      {task.status === 'pending' && <span className="text-muted-foreground font-bold bg-muted px-2 py-1 rounded-md text-xs">قيد الانتظار</span>}
                      {task.status === 'in_progress' && <span className="text-warning font-bold bg-warning/10 px-2 py-1 rounded-md text-xs">قيد التنفيذ</span>}
                      {task.status === 'completed' && <span className="text-success font-bold bg-success/10 px-2 py-1 rounded-md text-xs">مكتملة</span>}
                      {task.status === 'cancelled' && <span className="text-destructive font-bold bg-destructive/10 px-2 py-1 rounded-md text-xs">ملغاة</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-1.5 font-medium">
                        <User className="w-4 h-4 text-muted-foreground" /> {task.profiles?.full_name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">لا يوجد مهام حتى الآن</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
