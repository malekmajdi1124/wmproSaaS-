'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Settings2, Save, Trash2, AlertTriangle } from 'lucide-react'
import { updateSettings, resetSystem } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single()
      if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    
    const formData = new FormData(e.currentTarget)
    const result = await updateSettings(formData)
    
    setSaving(false)
    
    if (result.error) {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    } else {
      toast({ title: 'تم الحفظ', description: 'تم تحديث الإعدادات بنجاح.', className: 'bg-success text-success-foreground' })
    }
  }

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من مسح جميع بيانات الحسابات، المهام والاجتماعات؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    
    setSaving(true)
    const result = await resetSystem()
    setSaving(false)
    
    if (result.error) {
      toast({ variant: 'destructive', title: 'خطأ', description: result.error })
    } else {
      toast({ title: 'نجاح', description: 'تم إعادة ضبط النظام ومسح البيانات.', className: 'bg-success text-success-foreground' })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          إعدادات النظام
        </h1>
        <p className="text-muted-foreground text-sm">تخصيص النقاط، أيام المتابعة، ورسائل القوالب الافتراضية</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border p-5">
              <CardTitle className="text-lg">إعدادات عامة ونقاط</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>أيام تأخير المتابعة</Label>
                  <Input name="followup_delay_days" type="number" defaultValue={settings?.followup_delay_days || 3} required />
                </div>
                <div className="space-y-2">
                  <Label>نقاط المهمة الأولى</Label>
                  <Input name="initial_task_points" type="number" defaultValue={settings?.initial_task_points || 1} required />
                </div>
                <div className="space-y-2">
                  <Label>نقاط مهمة المتابعة</Label>
                  <Input name="follow_up_points" type="number" defaultValue={settings?.follow_up_points || 1} required />
                </div>
                <div className="space-y-2">
                  <Label>نقاط الاجتماع</Label>
                  <Input name="meeting_points" type="number" defaultValue={settings?.meeting_points || 3} required />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border p-5">
              <CardTitle className="text-lg">قوالب رسائل المتابعة الافتراضية</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>الرسالة - الأردن (JO)</Label>
                <Input name="template_jo" defaultValue={settings?.follow_up_templates?.JO || ''} required />
              </div>
              <div className="space-y-2">
                <Label>الرسالة - السعودية (SA)</Label>
                <Input name="template_sa" defaultValue={settings?.follow_up_templates?.SA || ''} required />
              </div>
              <div className="space-y-2">
                <Label>الرسالة - الإمارات (AE)</Label>
                <Input name="template_ae" defaultValue={settings?.follow_up_templates?.AE || ''} required />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              حفظ التعديلات
            </Button>
          </div>
        </div>
      </form>

      <Card className="border-destructive/20 shadow-sm mt-12 bg-destructive/5">
        <CardHeader className="border-b border-destructive/10 p-5">
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر (إعادة ضبط المصنع)
          </CardTitle>
          <CardDescription className="text-destructive/80 font-medium">
            سيؤدي هذا الإجراء إلى حذف جميع الحسابات، المهام، الاجتماعات، وسجل النقاط من قاعدة البيانات بشكل نهائي.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex justify-between items-center">
          <p className="text-sm font-medium text-destructive/90">
            تنبيه: سيبقى الموظفون والإعدادات كما هي، وسيتم تصفير كل شيء آخر.
          </p>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleReset}
            disabled={saving}
            className="font-bold shadow-sm active:scale-95"
          >
            <Trash2 className="mr-2 h-4 w-4" /> مسح جميع البيانات
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
