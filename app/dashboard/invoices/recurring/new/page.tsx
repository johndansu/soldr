import { createClient } from '@/lib/supabase/server'
import { RecurringTemplateForm } from '@/components/invoices/RecurringTemplateForm'
import { PageContent } from '@/components/ui/PageContent'

export default async function NewRecurringPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('user_id', user!.id).eq('status', 'active').order('name'),
    supabase.from('user_settings').select('default_currency, default_tax_rate').eq('user_id', user!.id).single(),
  ])

  return (
    <PageContent>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">New recurring invoice</h1>
          <p className="mt-0.5 text-sm text-gray-500">Set up a template — invoices generate automatically on schedule.</p>
        </div>
        <RecurringTemplateForm
          clients={clients ?? []}
          defaultCurrency={settings?.default_currency ?? 'NGN'}
          defaultTaxRate={settings?.default_tax_rate ?? 0}
        />
      </div>
    </PageContent>
  )
}
