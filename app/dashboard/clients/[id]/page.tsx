import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientNotes } from '@/components/clients/ClientNotes'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: client }, { data: notes }, { data: proposals }, { data: invoices }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', params.id).eq('user_id', user!.id).single(),
      supabase.from('client_notes').select('id, content, created_at').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('proposals').select('id, title, created_at').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, amount, currency, status, due_date').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])

  if (!client) notFound()

  const fmt = (amount: number, currency: string) =>
    currency === 'NGN' ? `₦${amount.toLocaleString()}` : `$${amount.toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/clients" className="text-sm text-gray-500 hover:text-gray-700">
            ← Clients
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.company && <p className="mt-0.5 text-sm text-gray-500">{client.company}</p>}
          {client.email && <p className="text-sm text-gray-400">{client.email}</p>}
        </div>
        <span className={`mt-6 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
          client.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {client.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Proposals</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{proposals?.length ?? 0}</p>
          {proposals?.slice(0, 2).map((p) => (
            <Link key={p.id} href={`/dashboard/proposals/${p.id}`} className="mt-1 block text-xs text-gray-500 hover:underline truncate">
              {p.title ?? 'Untitled'} — {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Link>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Invoices</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{invoices?.length ?? 0}</p>
          {invoices?.slice(0, 2).map((inv) => (
            <p key={inv.id} className="mt-1 text-xs text-gray-500 truncate">
              {fmt(inv.amount, inv.currency)} · <span className={inv.status === 'overdue' ? 'text-red-600' : ''}>{inv.status}</span>
            </p>
          ))}
        </div>
      </div>

      <ClientNotes clientId={params.id} initialNotes={notes ?? []} />
    </div>
  )
}
