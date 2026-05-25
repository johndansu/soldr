import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail'
import { PageContent } from '@/components/ui/PageContent'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [{ data: invoice }, { data: settings }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, due_date, created_at, status, line_items, tax_rate, discount, discount_type, notes, public_token, description, proposal_id, clients(name, email), proposals(id, title)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_settings')
      .select('business_name, business_email, business_address, business_phone, bank_details')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('invoice_payments')
      .select('id, amount, paid_date, notes')
      .eq('invoice_id', params.id)
      .eq('user_id', user.id)
      .order('paid_date', { ascending: true }),
  ])

  if (!invoice) return notFound()

  const clientRaw = invoice.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  const proposalRaw = invoice.proposals
  const proposal = (Array.isArray(proposalRaw) ? proposalRaw[0] : proposalRaw) as { id: string; title: string | null } | null

  return (
    <PageContent>
      <InvoiceDetail
        invoice={{ ...invoice, clients: client, proposal }}
        business={settings ?? { business_name: null, business_email: null, business_address: null, business_phone: null, bank_details: null }}
        payments={payments ?? []}
      />
    </PageContent>
  )
}
