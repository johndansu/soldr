import { createClient } from '@/lib/supabase/server'
import { NewInvoiceForm } from '@/components/invoices/NewInvoiceForm'
import { PageContent } from '@/components/ui/PageContent'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { proposalId?: string; clientId?: string; projectId?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, email')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('user_settings')
      .select('default_currency, default_tax_rate, invoice_sequence, business_name, business_email, business_address, business_phone')
      .eq('user_id', user!.id)
      .single(),
  ])

  const nextSeq = (settings?.invoice_sequence ?? 0) + 1
  const nextInvoiceNumber = `INV-${String(nextSeq).padStart(3, '0')}`

  let prefill: { clientId: string; description: string } | undefined

  // Pre-fill from a nudge (client only)
  if (searchParams.clientId) {
    prefill = { clientId: searchParams.clientId, description: '' }
  }

  // Pre-fill from a proposal (overrides clientId if both somehow set)
  if (searchParams.proposalId) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('client_id, title')
      .eq('id', searchParams.proposalId)
      .eq('user_id', user!.id)
      .single()
    if (proposal) {
      prefill = {
        clientId: proposal.client_id ?? '',
        description: proposal.title ?? '',
      }
    }
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">New Invoice</h1>
          <p className="mt-0.5 text-sm text-gray-500">Build your invoice with line items, tax, and discount.</p>
        </div>
        <NewInvoiceForm
          clients={clients ?? []}
          defaultCurrency={settings?.default_currency ?? 'NGN'}
          defaultTaxRate={settings?.default_tax_rate ?? 0}
          nextInvoiceNumber={nextInvoiceNumber}
          business={{
            name: settings?.business_name ?? null,
            email: settings?.business_email ?? null,
            address: settings?.business_address ?? null,
            phone: settings?.business_phone ?? null,
          }}
          prefill={prefill}
          proposalId={searchParams.proposalId}
          projectId={searchParams.projectId}
        />
      </div>
    </PageContent>
  )
}
