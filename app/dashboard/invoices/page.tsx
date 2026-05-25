import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { InvoiceStatusButton } from '@/components/invoices/InvoiceStatusButton'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { ExportButton } from '@/components/invoices/ExportButton'

export default async function InvoicesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: invoices }, { data: dueTemplates }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, amount, currency, due_date, status, description, invoice_number, created_at, template_id, clients(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoice_templates')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('active', true)
      .lte('next_run_date', today),
  ])

  const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }
  const fmt = (amount: number, currency: string) =>
    `${SYMBOLS[currency] ?? currency}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <PageContent>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-400">{invoices?.length ?? 0} invoice{invoices?.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Link href="/dashboard/invoices/recurring"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 8A6 6 0 1 1 8 2" /><path d="M14 2v4h-4" />
            </svg>
            Recurring
            {(dueTemplates?.length ?? 0) > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                {dueTemplates!.length}
              </span>
            )}
          </Link>
          <Link href="/dashboard/invoices/new"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            New invoice
          </Link>
        </div>
      </div>

      {/* Due templates alert */}
      {(dueTemplates?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3.5 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{dueTemplates!.length} recurring invoice{dueTemplates!.length === 1 ? '' : 's'} ready to generate</span>
            <span className="text-amber-600 ml-1.5">— {dueTemplates!.map((t) => t.name).join(', ')}</span>
          </p>
          <Link href="/dashboard/invoices/recurring"
            className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors ml-4">
            Generate now →
          </Link>
        </div>
      )}

      {!invoices?.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No invoices yet.</p>
          <Link href="/dashboard/invoices/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Create your first invoice →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice #</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Due</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest" aria-label="Actions" title="Actions" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const clientRaw = inv.clients
                const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
                const isRecurring = !!(inv as { template_id?: string | null }).template_id
                return (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="hover:underline underline-offset-2">
                          {client?.name ?? '—'}
                        </Link>
                        {isRecurring && (
                          <span title="Auto-generated from recurring template">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                              <path d="M14 8A6 6 0 1 1 8 2" /><path d="M14 2v4h-4" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {inv.invoice_number
                        ? <span className="font-mono text-xs text-gray-400">{inv.invoice_number}</span>
                        : (inv.description || '—')}
                    </td>
                    <td className="px-5 py-3.5 font-medium tabular-nums text-gray-900">{fmt(inv.amount, inv.currency)}</td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <InvoiceStatusButton id={inv.id} status={inv.status as 'unpaid' | 'paid' | 'overdue' | 'cancelled'} />
                    </td>
                    <td className="px-5 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton endpoint={`/api/invoices/${inv.id}`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </PageContent>
  )
}
