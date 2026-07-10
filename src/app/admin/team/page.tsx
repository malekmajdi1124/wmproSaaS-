'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Users, ShieldAlert, User, ShieldCheck, Power, PowerOff } from 'lucide-react'
import { toggleUserStatus } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      setProfiles(data)
    }
    setLoading(false)
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const result = await toggleUserStatus(userId, currentStatus)
    if (result.error) {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    } else {
      toast({ 
        title: 'نجاح', 
        description: currentStatus ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب',
        className: 'bg-success text-success-foreground'
      })
      loadProfiles()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          فريق العمل
        </h1>
        <p className="text-muted-foreground text-sm">إدارة حسابات الموظفين وصلاحياتهم في المنصة</p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border p-5">
          <CardTitle className="text-lg">الأعضاء المسجلين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">الاسم</th>
                  <th className="px-6 py-4 font-bold">الدور</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">تاريخ الانضمام</th>
                  <th className="px-6 py-4 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {profile.full_name}
                    </td>
                    <td className="px-6 py-4">
                      {profile.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive text-xs font-bold px-2.5 py-1 rounded-md border border-destructive/20">
                          <ShieldAlert className="w-3.5 h-3.5" /> مدير
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md border border-primary/20">
                          <User className="w-3.5 h-3.5" /> موظف
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-1 text-success font-medium">
                          <ShieldCheck className="w-4 h-4" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                          <PowerOff className="w-4 h-4" /> موقوف
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground" dir="ltr">
                      {new Date(profile.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant={profile.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleStatus(profile.id, profile.is_active)}
                        className={profile.is_active ? 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground' : 'bg-success/10 text-success hover:bg-success hover:text-success-foreground'}
                      >
                        {profile.is_active ? <Power className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                        {profile.is_active ? 'إيقاف' : 'تفعيل'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                لا يوجد أعضاء في الفريق حالياً
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
