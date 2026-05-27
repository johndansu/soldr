import { createClient } from '@/lib/supabase/server'
import { PageContent } from '@/components/ui/PageContent'
import { TimeTracker } from '@/components/time/TimeTracker'

export default async function TimePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clients }, { data: entries }, { data: settings }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('user_id', user!.id).eq('status', 'active').order('name'),
    supabase.from('time_entries')
      .select('id, date, hours, description, rate, currency, invoiced, invoice_id, client_id, clients(name)')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('user_settings')
      .select('default_currency')
      .eq('user_id', user!.id)
      .single(),
  ])

  return (
    <PageContent>
      <TimeTracker
        clients={clients ?? []}
        initialEntries={entries ?? []}
        defaultCurrency={settings?.default_currency ?? 'NGN'}
      />
    </PageContent>
  )
}
