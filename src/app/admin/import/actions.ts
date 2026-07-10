'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function validateAccounts(usernames: string[]) {
  const supabase = await createClient()
  const lowerUsernames = usernames.map(u => u.toLowerCase())
  
  // Need to chunk if too many, but assume < 100 for now
  const { data } = await supabase
    .from('instagram_accounts')
    .select('username')
  
  // In-memory filter for now to avoid complex ilike queries
  const existing = data?.filter(d => lowerUsernames.includes(d.username.toLowerCase())).map(d => d.username.toLowerCase()) || []
  return existing
}

export async function processImport(batch: any, accounts: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Fetch active agents to distribute accounts to
  const { data: agents, error: agentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'agent')
    .eq('is_active', true)

  if (agentError || !agents || agents.length === 0) {
    return { error: 'لا يوجد موظفين نشطين لتوزيع الحسابات عليهم' }
  }

  const agentIds = agents.map(a => a.id)

  // 2. Prepare payload for RPC
  const payload = {
    batch_name: batch.batch_name,
    accounts: accounts
  }

  // 3. Call the admin_import_and_assign RPC
  const { data: result, error: rpcError } = await supabase.rpc('admin_import_and_assign', {
    p_payload: payload,
    p_selected_agent_ids: agentIds,
    p_assignment_date: batch.assignment_date
  })

  if (rpcError) {
    return { error: 'حدث خطأ أثناء حفظ وتوزيع الحسابات: ' + rpcError.message }
  }

  revalidatePath('/admin/import')
  revalidatePath('/admin/dashboard')
  
  return { success: true, distributed: result.imported_count }
}

export async function getRecentBatches() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  const { data } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

export async function deleteBatch(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // Need to delete tasks, meetings, accounts, then the batch.
  // We can fetch the account IDs in this batch
  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('id')
    .eq('import_batch_id', batchId)

  if (accounts && accounts.length > 0) {
    const accountIds = accounts.map(a => a.id)
    
    // 1. Delete points for tasks
    const { data: tasks } = await supabase.from('outreach_tasks').select('id').in('account_id', accountIds)
    if (tasks && tasks.length > 0) {
      const { error: pError } = await supabase.from('points_ledger').delete().in('task_id', tasks.map(t => t.id))
      if (pError) return { error: 'Failed to delete points for tasks: ' + pError.message }
    }

    // 2. Delete points for meetings
    const { data: meetings } = await supabase.from('meetings').select('id').in('account_id', accountIds)
    if (meetings && meetings.length > 0) {
      const { error: pmError } = await supabase.from('points_ledger').delete().in('meeting_id', meetings.map(m => m.id))
      if (pmError) return { error: 'Failed to delete points for meetings: ' + pmError.message }
    }

    // 3. Delete tasks and meetings
    const { error: tError } = await supabase.from('outreach_tasks').delete().in('account_id', accountIds)
    if (tError) return { error: 'Failed to delete tasks: ' + tError.message }
    
    const { error: mError } = await supabase.from('meetings').delete().in('account_id', accountIds)
    if (mError) return { error: 'Failed to delete meetings: ' + mError.message }
    
    // 4. Delete accounts
    const { error: aError } = await supabase.from('instagram_accounts').delete().in('id', accountIds)
    if (aError) return { error: 'Failed to delete accounts: ' + aError.message }
  }

  const { error } = await supabase.from('import_batches').delete().eq('id', batchId)
  if (error) return { error: error.message }

  await supabase.from('audit_events').insert({
    actor_id: user.id,
    event_type: 'batch_deleted',
    entity_type: 'import_batches',
    entity_id: batchId
  })

  revalidatePath('/admin/import')
  return { success: true }
}
