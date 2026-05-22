import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: proposals }, { data: invoices }] = await Promise.all([
    supabase.from('proposals').select('id, title, brief_input, created_at, clients(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id, amount, currency, status, due_date, clients(name)').eq('user_id', user!.id).in('status', ['unpaid', 'overdue']).order('due_date', { ascending: true }).limit(5),
  ])

  const fmt = (amount: number, currency: string) =>
    currency === 'NGN' ? `₦${amount.toLocaleString()}` : `$${amount.toLocaleString()}`

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">{user?.email}</p>
        </div>
        <Link
          href="/dashboard/proposals/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New proposal
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent proposals</p>
        {!proposals?.length ? (
          <p className="text-sm text-gray-400 py-3">No proposals yet. <Link href="/dashboard/proposals/new" className="text-gray-900 underline">Write your first one →</Link></p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {proposals.map((p) => {
              const client = (p.clients as unknown as { name: string } | null)
              const title = p.title ?? p.brief_input?.slice(0, 60) + '…'
              const date = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              return (
                <Link key={p.id} href={`/dashboard/proposals/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <p className="text-sm text-gray-900 truncate">{title}</p>
                  <p className="ml-4 shrink-0 text-xs text-gray-400">{client?.name ? `${client.name} · ` : ''}{date}</p>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {!!invoices?.length && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Unpaid invoices</p>
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {invoices.map((inv) => {
              const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
              return (
                <Link key={inv.id} href="/dashboard/invoices" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-900">{client?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-gray-900">{fmt(inv.amount, inv.currency)}</p>
                    <p className={`text-xs font-medium ${inv.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}>● {inv.status}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
