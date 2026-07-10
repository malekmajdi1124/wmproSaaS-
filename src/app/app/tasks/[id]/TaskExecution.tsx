'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ExternalLink, Copy, CheckCircle2, Loader2, ArrowRight, AlertCircle, Info } from 'lucide-react'
import { updateTaskProgress, completeTaskAction } from './actions'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function TaskExecution({ task, account, nextTaskId }: { task: any, account: any, nextTaskId?: string | null }) {
  if (!account) account = {}
  const { toast } = useToast()
  const router = useRouter()
  
  const isFollowUp = task.task_type === 'follow_up'
  const isCompleted = task.status === 'completed'
  const isCancelled = task.status === 'cancelled'
  
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(!!task.profile_opened_at || isCompleted)
  const [followed, setFollowed] = useState(task.follow_confirmed || isCompleted)
  
  const [msg1Copied, setMsg1Copied] = useState(!!task.message_1_copied_at || isCompleted)
  const [msg1Sent, setMsg1Sent] = useState(isCompleted)
  
  const [msg2Copied, setMsg2Copied] = useState(!!task.message_2_copied_at || isCompleted)
  const [msg2Sent, setMsg2Sent] = useState(isCompleted)

  const [success, setSuccess] = useState(isCompleted && !isCancelled)

  const canComplete = isFollowUp 
    ? (opened && msg1Sent)
    : (opened && followed && msg1Sent && msg2Sent)

  const stepsCompletedCount = [
    opened && followed,
    msg1Sent,
    isFollowUp ? true : msg2Sent
  ].filter(Boolean).length

  const totalSteps = isFollowUp ? 2 : 3
  const currentStep = opened && followed ? (msg1Sent ? 3 : 2) : 1

  const handleOpenProfile = async () => {
    const url = account.username ? `https://www.instagram.com/${account.username}/` : account.profile_url;
    window.open(url, '_blank')
    if (!opened) {
      setOpened(true)
      await updateTaskProgress(task.id, 'opened')
    }
  }

  const handleCopy = async (text: string, type: 'msg1' | 'msg2') => {
    try {
      await navigator.clipboard.writeText(text)
      
      if (type === 'msg1') {
        setMsg1Copied(true)
        if (!task.message_1_copied_at) updateTaskProgress(task.id, 'msg1')
      }
      if (type === 'msg2') {
        setMsg2Copied(true)
        if (!task.message_2_copied_at) updateTaskProgress(task.id, 'msg2')
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'فشل النسخ', description: 'يرجى النسخ يدوياً' })
    }
  }

  const handleComplete = async () => {
    if (!canComplete) return
    setLoading(true)
    
    const res = await completeTaskAction(task.id, isFollowUp)
    setLoading(false)
    
    if (res.error) {
      toast({ variant: 'destructive', title: 'خطأ', description: res.error })
    } else {
      setSuccess(true)
    }
  }

  const getMarketName = (country: string) => {
    switch (country) {
      case 'JO': return 'السوق الأردني 🇯🇴'
      case 'SA': return 'السوق السعودي 🇸🇦'
      case 'AE': return 'السوق الإماراتي 🇦🇪'
      default: return 'سوق غير محدد 🌐'
    }
  }

  if (success && !isCancelled) {
    const nextDate = format(addDays(new Date(), 3), 'd MMMM yyyy', { locale: ar })
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6 text-center">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">تم إنجاز المهمة بنجاح!</h2>
        <p className="text-muted-foreground bg-card border border-border p-4 rounded-xl">
          تم تسجيل المهمة وإضافة المتابعة بتاريخ {nextDate}
        </p>
        <div className="flex flex-col gap-3 pt-6">
          {nextTaskId ? (
            <Button onClick={() => router.push(`/app/tasks/${nextTaskId}`)} className="w-full h-12 text-lg font-bold bg-success hover:bg-success/90">
              المهمة التالية
              <ArrowRight className="ml-2 w-5 h-5 rotate-180" />
            </Button>
          ) : (
            <div className="p-4 bg-muted text-muted-foreground rounded-lg border border-border text-sm mb-2 font-medium">
              أحسنت! لم يتبقَ لديك مهام أخرى.
            </div>
          )}
          <Button onClick={() => router.push('/app/tasks')} variant="outline" className="w-full h-12 text-lg font-bold">
            العودة للمهام
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-24 relative" dir="rtl">
      
      {/* Header Bar */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/tasks')} className="text-muted-foreground shrink-0 bg-muted/50 hover:bg-muted">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-foreground">{account.business_name || account.username || 'حساب غير معروف'}</span>
          </div>
          <div className="text-sm text-muted-foreground dir-ltr text-right">@{account.username || 'unknown'}</div>
        </div>
        <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm shrink-0">
          {getMarketName(account.country)}
        </div>
      </div>

      {isCancelled && (
        <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex gap-3 text-warning">
          <Info className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">أُلغيت المتابعة بسبب حجز اجتماع. ما عاد مطلوب Follow-up لهذا الحساب.</p>
        </div>
      )}

      {/* Account Info Note */}
      {account.niche && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex gap-3 items-start">
            <div className="bg-accent text-accent-foreground p-2 rounded-lg shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">المجال / النشاط</p>
              <p className="text-sm font-medium">{account.niche}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vertical Stepper */}
      <div className="space-y-4">
        
        {/* Step 1 */}
        <Card className={`border-border shadow-sm transition-opacity ${!isCancelled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${opened && followed ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'}`}>
                {opened && followed ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <CardTitle className="text-base">افتح الحساب وتابعه</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <Button 
              onClick={handleOpenProfile} 
              variant="outline"
              className="w-full h-12 justify-between border-primary/20 hover:bg-primary/5 text-primary"
            >
              <span className="font-medium">فتح حساب إنستغرام</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            
            <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning leading-relaxed">
                التأكيد يدوي؛ تأكد أنك تابعت الحساب في إنستغرام قبل التعليم هنا.
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <Checkbox 
                id="follow" 
                checked={followed} 
                onCheckedChange={(c) => {
                  setFollowed(!!c)
                  if (c) updateTaskProgress(task.id, 'confirmed')
                }}
                disabled={isCompleted || !opened}
                className="w-5 h-5 data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              <label htmlFor="follow" className={`text-sm font-medium cursor-pointer ${!opened ? 'text-muted-foreground' : 'text-foreground'}`}>
                تمت متابعة الحساب
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className={`border-border shadow-sm transition-opacity ${(opened && followed) || isCompleted ? 'opacity-100' : 'opacity-50 pointer-events-none'} ${isCancelled ? 'hidden' : ''}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${msg1Sent ? 'bg-success text-success-foreground' : (opened && followed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}`}>
                {msg1Sent ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <CardTitle className="text-base">{isFollowUp ? 'أرسل رسالة المتابعة' : 'أرسل الرسالة الأولى'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="bg-muted p-4 rounded-lg text-sm text-foreground whitespace-pre-wrap select-all leading-relaxed border border-border">
              {isFollowUp ? task.follow_up_message : task.message_1}
            </div>
            
            <Button 
              onClick={() => handleCopy(isFollowUp ? task.follow_up_message : task.message_1, 'msg1')} 
              variant={msg1Copied ? "outline" : "default"}
              className={`w-full h-11 ${msg1Copied ? 'border-success text-success hover:bg-success/5' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {msg1Copied ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> تم النسخ</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> نسخ الرسالة</>
              )}
            </Button>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <Checkbox 
                id="msg1sent" 
                checked={msg1Sent} 
                onCheckedChange={(c) => setMsg1Sent(!!c)}
                disabled={isCompleted || !msg1Copied}
                className="w-5 h-5 data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              <label htmlFor="msg1sent" className={`text-sm font-medium cursor-pointer ${!msg1Copied ? 'text-muted-foreground' : 'text-foreground'}`}>
                تم إرسال الرسالة
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 (Only for initial) */}
        {!isFollowUp && (
          <Card className={`border-border shadow-sm transition-opacity ${msg1Sent || isCompleted ? 'opacity-100' : 'opacity-50 pointer-events-none'} ${isCancelled ? 'hidden' : ''}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${msg2Sent ? 'bg-success text-success-foreground' : (msg1Sent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}`}>
                  {msg2Sent ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                </div>
                <CardTitle className="text-base">أرسل الرسالة الثانية</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm text-foreground whitespace-pre-wrap select-all leading-relaxed border border-border">
                {task.message_2}
              </div>
              
              <Button 
                onClick={() => handleCopy(task.message_2, 'msg2')} 
                variant={msg2Copied ? "outline" : "default"}
                className={`w-full h-11 ${msg2Copied ? 'border-success text-success hover:bg-success/5' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {msg2Copied ? (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> تم النسخ</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> نسخ الرسالة</>
                )}
              </Button>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <Checkbox 
                  id="msg2sent" 
                  checked={msg2Sent} 
                  onCheckedChange={(c) => setMsg2Sent(!!c)}
                  disabled={isCompleted || !msg2Copied}
                  className="w-5 h-5 data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <label htmlFor="msg2sent" className={`text-sm font-medium cursor-pointer ${!msg2Copied ? 'text-muted-foreground' : 'text-foreground'}`}>
                  تم إرسال الرسالة الثانية
                </label>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      {!isCancelled && !success && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 md:static md:bg-transparent md:border-none md:shadow-none md:p-0 mt-6 md:mt-8">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-muted-foreground shrink-0 hidden sm:block">
              أنجزت {stepsCompletedCount} من {totalSteps} خطوات
            </div>
            <Button 
              size="lg" 
              disabled={!canComplete || loading || isCompleted}
              onClick={handleComplete}
              className="flex-1 h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-full"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isCompleted ? (
                'المهمة منجزة مسبقاً'
              ) : (
                'تأكيد إنجاز المهمة'
              )}
            </Button>
          </div>
          {!canComplete && !isCompleted && (
            <p className="text-xs text-center text-muted-foreground mt-2 sm:hidden">
              أكمل جميع الخطوات أولاً
            </p>
          )}
        </div>
      )}

    </div>
  )
}
