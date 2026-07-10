'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Calendar, Phone, Hash, Clock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MeetingsPage() {
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadMeetings()
  }, [])

  async function loadMeetings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select('*, instagram_accounts(username, business_name), profiles!meetings_created_by_fkey(full_name)')
      .order('scheduled_at', { ascending: false })
    
    if (data) {
      setMeetings(data)
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
          <Calendar className="h-6 w-6 text-primary" />
          الاجتماعات المجدولة
        </h1>
        <p className="text-muted-foreground text-sm">سجل بجميع الاجتماعات التي تم حجزها مع العملاء المحتملين</p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border p-5">
          <CardTitle className="text-lg">قائمة الاجتماعات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">الحساب المستهدف</th>
                  <th className="px-6 py-4 font-bold">جهة الاتصال</th>
                  <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-bold">التخصص (Niche)</th>
                  <th className="px-6 py-4 font-bold">موعد الاجتماع</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الموظف المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground dir-ltr text-right">@{meeting.instagram_accounts?.username}</div>
                      <div className="text-xs text-muted-foreground">{meeting.instagram_accounts?.business_name}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {meeting.contact_name}
                    </td>
                    <td className="px-6 py-4" dir="ltr">
                      <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                        {meeting.phone} <Phone className="w-3.5 h-3.5" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {meeting.niche}
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium" dir="ltr">
                      <div className="flex items-center justify-end gap-1.5">
                        {new Date(meeting.scheduled_at).toLocaleString('en-GB', { hour12: true })} <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {meeting.status === 'scheduled' && <span className="text-primary font-bold bg-primary/10 px-2 py-1 rounded-md text-xs">مجدول</span>}
                      {meeting.status === 'completed' && <span className="text-success font-bold bg-success/10 px-2 py-1 rounded-md text-xs">مكتمل</span>}
                      {meeting.status === 'cancelled' && <span className="text-destructive font-bold bg-destructive/10 px-2 py-1 rounded-md text-xs">ملغي</span>}
                      {meeting.status === 'no_show' && <span className="text-warning font-bold bg-warning/10 px-2 py-1 rounded-md text-xs">لم يحضر</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-1.5 font-medium">
                        <User className="w-4 h-4 text-muted-foreground" /> {meeting.profiles?.full_name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meetings.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">لا يوجد اجتماعات مجدولة حالياً</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
