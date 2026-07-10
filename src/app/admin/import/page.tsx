'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertCircle, CheckCircle2, Copy, FileJson, Users, UserPlus, AlertTriangle, Trash2 } from 'lucide-react'
import { validateAccounts, processImport, getRecentBatches, deleteBatch } from './actions'

export default function ImportPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    setLoadingBatches(true)
    const data = await getRecentBatches()
    setBatches(data)
    setLoadingBatches(false)
  }

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('هل أنت متأكد من مسح هذه الدفعة؟ سيتم مسح جميع الحسابات والمهام المرتبطة بها نهائياً!')) return
    setLoadingBatches(true)
    const res = await deleteBatch(id)
    if (res.error) {
      toast({ variant: 'destructive', title: 'خطأ', description: res.error })
      setLoadingBatches(false)
    } else {
      toast({ title: 'نجاح', description: 'تم مسح الدفعة بنجاح', className: 'bg-success text-success-foreground' })
      fetchBatches()
    }
  }

  const exampleJson = `{
  "batch_name": "Jordan Leads - 2026-07-10",
  "assignment_date": "2026-07-10",
  "accounts": [
    {
      "country": "JO",
      "username": "example_store",
      "business_name": "اسم النشاط",
      "message_1": "الرسالة الأولى...",
      "message_2": "الرسالة الثانية..."
    }
  ]
}`

  const handleAnalyze = async () => {
    if (!jsonInput.trim()) return
    setAnalyzing(true)
    setPreview(null)
    
    try {
      let rawJson = jsonInput
      if (rawJson.startsWith('\`\`\`')) {
        rawJson = rawJson.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '')
      }

      const parsed = JSON.parse(rawJson)
      
      if (!parsed.batch_name || !parsed.assignment_date || !Array.isArray(parsed.accounts)) {
        throw new Error('صيغة JSON غير صحيحة. يجب أن يحتوي على batch_name, assignment_date, accounts')
      }

      const errors: string[] = []
      const usernames: string[] = []
      
      const validAccounts = parsed.accounts.filter((acc: any, index: number) => {
        let valid = true
        if (!acc.country || !['JO', 'SA', 'AE'].includes(acc.country)) {
          errors.push(`سجل ${index + 1}: دولة غير صالحة (${acc.country})`)
          valid = false
        }
        if (!acc.username) {
          errors.push(`سجل ${index + 1}: اسم المستخدم مفقود`)
          valid = false
        }
        if (!acc.message_1 || !acc.message_2) {
          errors.push(`سجل ${index + 1}: رسائل التواصل مفقودة`)
          valid = false
        }
        
        if (valid) {
          acc.username = acc.username.trim().replace(/^@/, '')
          if (!acc.profile_url) {
            acc.profile_url = `https://www.instagram.com/${acc.username}/`
          }
          usernames.push(acc.username)
        }
        return valid
      })

      const existingUsernames = await validateAccounts(usernames)
      
      const newAccounts = []
      const duplicates = []
      
      for (const acc of validAccounts) {
        if (existingUsernames.includes(acc.username.toLowerCase())) {
          duplicates.push(acc.username)
        } else {
          newAccounts.push(acc)
        }
      }

      setPreview({
        batch: parsed,
        total: parsed.accounts.length,
        valid: validAccounts.length,
        errors,
        duplicates,
        newAccounts
      })

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ في التحليل', description: e.message })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.newAccounts.length === 0) return
    
    setLoading(true)
    const res = await processImport(preview.batch, preview.newAccounts)
    setLoading(false)
    
    if (res.error) {
      toast({ variant: 'destructive', title: 'خطأ أثناء الحفظ', description: res.error })
    } else {
      toast({ 
        title: 'تم الاستيراد بنجاح', 
        description: `تم إضافة وتوزيع ${res.distributed} حساب.`,
        className: 'bg-success text-success-foreground border-none'
      })
      setJsonInput('')
      setPreview(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <FileJson className="h-6 w-6 text-primary" />
          استيراد الحسابات
        </h1>
        <p className="text-muted-foreground text-sm">أدخل البيانات المستخرجة ليتم توزيعها تلقائياً على فريق المبيعات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Step 1: Input */}
        <Card className="lg:col-span-6 bg-card border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b border-border p-5">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">1. إدخال البيانات</CardTitle>
                <CardDescription className="text-sm mt-1">الصق مصفوفة JSON هنا</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setJsonInput(exampleJson)} className="text-primary border-primary/20 hover:bg-primary/5">
                <Copy className="mr-2 h-4 w-4" /> قالب جاهز
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <Textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="الصق الـ JSON هنا..."
              className="min-h-[350px] font-mono text-sm bg-muted/50 border-border text-foreground resize-none p-4"
              dir="ltr"
            />
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm text-muted-foreground space-y-2">
              <p className="font-bold text-foreground">تعليمات كتابة مصفوفة البيانات (JSON):</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">batch_name</code>: اسم الدفعة (مثال: Jordan Leads - 2026-07-10)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">assignment_date</code>: تاريخ الإسناد بصيغة YYYY-MM-DD</li>
                <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">accounts</code>: مصفوفة تحتوي على الحسابات، كل حساب يجب أن يحتوي على:</li>
                <ul className="list-disc list-inside mr-4 space-y-1">
                  <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">country</code>: رمز الدولة (JO للاردن، SA للسعودية، AE للامارات)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">username</code>: اسم المستخدم في انستغرام (بدون @)</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">business_name</code>: اسم النشاط التجاري</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">message_1</code>: الرسالة الأولى</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded text-foreground">message_2</code>: الرسالة الثانية</li>
                </ul>
              </ul>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || !jsonInput.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-bold shadow-sm"
            >
              {analyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'تحليل البيانات ومراجعتها'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Review & Submit */}
        <div className="lg:col-span-6">
          {!preview ? (
            <Card className="h-full border-dashed border-2 border-border/60 bg-transparent shadow-none flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">الخطوة 2: المراجعة والتأكيد</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">بعد تحليل البيانات، ستظهر هنا ملخص الحسابات التي سيتم استيرادها لمعاينتها قبل الاعتماد.</p>
            </Card>
          ) : (
            <Card className="h-full bg-card border-border shadow-md flex flex-col">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-5">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> نتيجة التحليل
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1 text-foreground">مراجعة البيانات قبل الاعتماد النهائي للإرسال</CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-xl border border-border text-center">
                    <div className="text-3xl font-bold text-foreground mb-1">{preview.total}</div>
                    <div className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" /> إجمالي السجلات
                    </div>
                  </div>
                  <div className="bg-success/10 p-4 rounded-xl border border-success/20 text-center">
                    <div className="text-3xl font-bold text-success mb-1">{preview.newAccounts.length}</div>
                    <div className="text-sm text-success font-medium flex items-center justify-center gap-1">
                      <UserPlus className="w-4 h-4" /> حسابات جديدة
                    </div>
                  </div>
                </div>

                {preview.duplicates.length > 0 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-warning font-bold mb-2">
                      <AlertTriangle className="h-5 w-5" /> 
                      <span>حسابات مكررة (سيتم تخطيها): {preview.duplicates.length}</span>
                    </div>
                    <p className="text-sm text-warning font-medium">هذه الحسابات مسجلة مسبقاً في النظام وتم استبعادها لمنع التكرار.</p>
                  </div>
                )}

                {preview.errors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 max-h-[150px] overflow-y-auto">
                    <div className="flex items-center gap-2 text-destructive font-bold mb-2">
                      <AlertCircle className="h-5 w-5" /> 
                      <span>أخطاء في بنية البيانات: {preview.errors.length}</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-destructive font-medium space-y-1">
                      {preview.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-auto pt-6">
                  <Button 
                    onClick={handleImport} 
                    disabled={loading || preview.newAccounts.length === 0 || preview.errors.length > 0}
                    className="w-full h-14 bg-success hover:bg-success/90 text-success-foreground text-lg font-bold shadow-lg shadow-success/20 transition-transform active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (
                      <>
                        <CheckCircle2 className="mr-2 h-6 w-6" /> اعتماد وتوزيع المهام
                      </>
                    )}
                  </Button>
                  {(preview.errors.length > 0) && (
                    <p className="text-center text-xs text-destructive mt-3 font-medium">يجب إصلاح الأخطاء في JSON قبل المتابعة</p>
                  )}
                  {(preview.newAccounts.length === 0 && preview.errors.length === 0) && (
                    <p className="text-center text-xs text-muted-foreground mt-3 font-medium">لا توجد حسابات جديدة للاستيراد</p>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b border-border p-5">
            <CardTitle className="text-lg">سجل الدفعات المستوردة (Batches)</CardTitle>
            <CardDescription>آخر الدفعات التي تم استيرادها وتوزيعها على فريق المبيعات</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingBatches ? (
              <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا يوجد دفعات مستوردة بعد</div>
            ) : (
              <div className="divide-y divide-border">
                {batches.map(batch => (
                  <div key={batch.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{batch.batch_name}</h4>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                        <span>التاريخ: {batch.assignment_date}</span>
                        <span>عدد الحسابات: {batch.imported_records || 0}</span>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteBatch(batch.id)}
                      title="مسح الدفعة"
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
