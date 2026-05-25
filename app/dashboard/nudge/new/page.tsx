import { createClient } from '@/lib/supabase/server'
import { NudgeGenerator } from '@/components/nudge/NudgeGenerator'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}

export default async function NewNudgePage({
  searchParams,
}: {
  searchParams: { invoiceId?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .order('name')

  let initialContext = ''
  let initialClientId = ''

  if (searchParams.invoiceId) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, amount, currency, due_date, status, client_id, clients(name)')
      .eq('id', searchParams.invoiceId)
      .eq('user_id', user!.id)
      .single()

    if (invoice) {
      initialClientId = invoice.client_id ?? ''

      const sym = CURRENCY_SYMBOLS[invoice.currency] ?? invoice.currency
      const clientRaw = invoice.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null

      const dueDate = new Date(invoice.due_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      const statusNote = diffDays > 0
        ? `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`
        : diffDays < 0
          ? `due in ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`
          : 'due today'

      const parts = [
        client?.name ?? null,
        invoice.invoice_number ?? null,
        `for ${sym}${invoice.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `due ${dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        statusNote,
      ].filter(Boolean)

      initialContext = parts.join(', ') + '. [Add any context about the client or situation here]'
    }
  }

  return (
    <NudgeGenerator
      clients={clients ?? []}
      initialContext={initialContext}
      initialClientId={initialClientId}
    />
  )
}
