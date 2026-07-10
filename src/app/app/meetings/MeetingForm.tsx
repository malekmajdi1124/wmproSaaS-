'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { bookMeetingAction } from './actions'
import { Plus, Loader2, Search, Check, AlertCircle, Info, Calendar } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function MeetingForm({ accounts }: { accounts: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [niche, setNiche] = useState('')
  const [notes, setNotes] = useState('')

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  const handleSelectAccount = (id: string, accountNiche: string) => {
    setSelectedAccountId(id)
    setNiche(accountNiche || '')
    setOpenCombobox(false)
  }

  async function onSubmit(formData: FormData) {
    if (!selectedAccountId) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء اختيار الحساب أولاً' })
      return
    }
    
    formData.append('account_id', selectedAccountId)
    
    setLoading(true)
    const result = await bookMeetingAction(formData)
    setLoading(false)
    
    if (result.error) {
      toast({ variant: "destructive", title: "خطأ", description: result.error })
    } else {
      toast({ 
        title: "تم حجز الاجتماع", 
        description: `تم ربح ${result.data?.points_earned} نقطة.`,
        className: 'bg-success text-success-foreground border-none'
      })
      setOpen(false)
      setSelectedAccountId('')
      setNiche('')
      setNotes('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-10" />}>
        <Plus className="mr-2 h-4 w-4" /> إضافة اجتماع
      </DialogTrigger>
      <DialogContent className="max-w-md w-full h-[100dvh] sm:h-auto p-0 sm:p-6 bg-card border-none sm:border sm:border-border sm:rounded-2xl flex flex-col !rounded-none sm:!rounded-2xl" dir="rtl">
        <DialogHeader className="p-4 sm:p-0 border-b border-border sm:border-none sticky top-0 bg-card z-10 shrink-0 text-right">
          <DialogTitle className="text-xl font-bold">حجز اجتماع جديد</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-0">
          <form action={onSubmit} className="space-y-5 pb-24 sm:pb-0" id="meeting-form">
            
            <div className="space-y-2">
              <Label className="text-foreground font-medium">الحساب (إنستغرام)</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger render={<Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between bg-card border-border hover:bg-muted text-foreground h-12"
                  />}>
                    {selectedAccount ? (
                      <span className="truncate font-bold">{selectedAccount.business_name || selectedAccount.username}</span>
                    ) : (
                      <span className="text-muted-foreground">ابحث عن حساب تواصلت معه...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[380px] p-0 bg-card border-border shadow-lg" dir="rtl">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="ابحث باسم الحساب، النشاط..." className="border-none focus:ring-0 text-base h-11" />
                    <CommandList>
                      <CommandEmpty className="p-4 text-center text-sm text-muted-foreground">لم يتم العثور على حساب مؤهل.</CommandEmpty>
                      <CommandGroup>
                        {accounts.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={`${account.username} ${account.business_name} ${account.contact_name}`}
                            onSelect={() => handleSelectAccount(account.id, account.niche)}
                            className="aria-selected:bg-primary/10 aria-selected:text-primary cursor-pointer p-3 border-b border-border/50 last:border-0"
                          >
                            <div className="flex flex-col flex-1 mr-2">
                              <span className="font-bold">{account.business_name || account.username}</span>
                              <span className="text-xs text-muted-foreground dir-ltr text-right mt-1">@{account.username} • {account.country}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-5 w-5 text-primary shrink-0",
                                selectedAccountId === account.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedAccount && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 text-sm">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-foreground">تأكيد الحساب المختار</p>
                  <p className="text-muted-foreground mt-0.5">
                    تاريخ التواصل الأول: {format(new Date(selectedAccount.outreach_tasks[0].assignment_date), 'd MMMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-foreground font-medium">اسم الشخص (إن عُرف)</Label>
              <Input id="contact_name" name="contact_name" required defaultValue={selectedAccount?.contact_name || ''} className="bg-card border-border h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground font-medium">رقم الهاتف (مع الرمز الدولي)</Label>
              <Input id="phone" name="phone" required placeholder="+962 7X XXX XXXX" className="bg-card border-border dir-ltr text-left h-12 text-lg font-mono" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="niche" className="text-foreground font-medium">المجال / النشاط</Label>
                <Input id="niche" name="niche" value={niche} onChange={(e) => setNiche(e.target.value)} required className="bg-card border-border h-12" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_at" className="text-foreground font-medium">تاريخ ووقت الاجتماع</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required className="bg-card border-border h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="notes" className="text-foreground font-medium">ملاحظات التحضير (اختياري)</Label>
                <span className="text-xs text-muted-foreground">{notes.length}/200</span>
              </div>
              <Textarea 
                id="notes" 
                name="notes" 
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية ملاحظات تفيد في الاجتماع..." 
                className="bg-card border-border min-h-[100px] resize-none p-3" 
              />
            </div>

            {selectedAccount && (
              <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning font-medium leading-relaxed">
                  ملاحظة: سيتم إلغاء مهمة المتابعة (Follow-up) تلقائياً لهذا الحساب بمجرد تأكيد حجز الاجتماع.
                </p>
              </div>
            )}
            
            <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-card sm:bg-transparent border-t border-border sm:border-none shadow-[0_-4px_10px_rgba(0,0,0,0.05)] sm:shadow-none z-20 mt-6">
              <Button type="submit" disabled={loading} className="w-full h-14 sm:h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-[0.98]">
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'تأكيد حجز الاجتماع'}
              </Button>
            </div>
            
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
