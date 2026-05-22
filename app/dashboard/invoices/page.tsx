import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { InvoiceStatusButton } from '@/components/invoices/InvoiceStatusButton'

export default async function InvoicesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, amount, currency, due_date, status, description, created_at, clients(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const fmt = (amount: number, currency: string) =>
    currency === 'NGN' ? `₦${amount.toLocaleString()}` : `$${amount.toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-400">{invoices?.length ?? 0} invoice{invoices?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/invoices/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          New invoice
        </Link>
      </div>

      {!invoices?.length ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No invoices yet.</p>
          <Link href="/dashboard/invoices/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Create your first invoice →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const clientRaw = inv.clients
                const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
                return (
                  <tr key={inv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.description || '—'}</td>
                    <td className="px-4 py-3 font-medium tabular-nums text-gray-900">{fmt(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusButton id={inv.id} status={inv.status as 'unpaid' | 'paid' | 'overdue' | 'cancelled'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
