import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Calendar, Clock, Phone, User, Briefcase, MapPin } from 'lucide-react'
import MeetingForm from './MeetingForm'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: eligibleAccounts } = await supabase
    .from('instagram_accounts')
    .select(`
      id, username, business_name, niche, country, contact_name,
      outreach_tasks!inner(assigned_to, task_type, status, assignment_date),
      meetings(status)
    `)
    .eq('outreach_tasks.assigned_to', user.id)
    .eq('outreach_tasks.task_type', 'initial')
    .eq('outreach_tasks.status', 'completed')
    
  const availableAccounts = (eligibleAccounts || []).filter(acc => 
    !acc.meetings.some((m: any) => m.status === 'scheduled')
  )

  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      *,
      instagram_accounts (username, business_name, country, niche)
    `)
    .eq('created_by', user.id)
    .order('scheduled_at', { ascending: true })

  const upcomingMeetings = meetings?.filter(m => new Date(m.scheduled_at) >= new Date(new Date().setHours(0,0,0,0))) || []
  const pastMeetings = meetings?.filter(m => new Date(m.scheduled_at) < new Date(new Date().setHours(0,0,0,0))) || []

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">الاجتماعات</h1>
          <p className="text-muted-foreground text-sm">إدارة المواعيد المحجوزة</p>
        </div>
        <MeetingForm accounts={availableAccounts} />
      </div>

      <div className="space-y-8">
        
        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            الاجتماعات القادمة 
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{upcomingMeetings.length}</span>
          </h2>
          <div className="space-y-4">
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-lg border border-border">
                لا توجد اجتماعات قادمة
              </div>
            ) : (
              upcomingMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)
            )}
          </div>
        </section>

        {/* Past */}
        {pastMeetings.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4 opacity-70">
              الاجتماعات السابقة
            </h2>
            <div className="space-y-4">
              {pastMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} isPast />)}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function MeetingCard({ meeting, isPast = false }: { meeting: any, isPast?: boolean }) {
  const acc = meeting.instagram_accounts
  
  return (
    <Card className={`bg-card shadow-sm border-border transition-colors ${isPast ? 'opacity-60' : 'hover:border-primary/50'}`}>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-5">
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-foreground text-lg mb-1">{meeting.contact_name || acc.business_name || acc.username}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{acc.business_name || acc.username}</span>
                <span>•</span>
                <span className="dir-ltr text-right">@{acc.username}</span>
              </div>
            </div>
            {!isPast && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-success/10 text-success">
                مجدول
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{acc.country}</span>
            </div>
            {meeting.niche && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>{meeting.niche}</span>
              </div>
            )}
            {meeting.phone && (
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Phone className="w-4 h-4 text-primary" />
                <a href={`tel:${meeting.phone}`} className="dir-ltr hover:underline hover:text-primary transition-colors">{meeting.phone}</a>
              </div>
            )}
          </div>
          {meeting.notes && (
             <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md mt-2 border border-border">
               {meeting.notes}
             </div>
          )}
        </div>
        
        {/* Date Time Block */}
        <div className="bg-muted p-3.5 rounded-xl border border-border shrink-0 min-w-[180px] flex sm:flex-col items-center sm:items-start sm:justify-center gap-4 sm:gap-2">
          <div className="flex items-center text-foreground font-medium flex-1 sm:flex-none">
            <Calendar className="ml-2 h-4 w-4 text-primary" />
            <span>{format(new Date(meeting.scheduled_at), 'd MMMM yyyy', { locale: ar })}</span>
          </div>
          <div className="flex items-center text-foreground font-medium">
            <Clock className="ml-2 h-4 w-4 text-primary" />
            <span className="dir-ltr text-right">{format(new Date(meeting.scheduled_at), 'h:mm a')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
