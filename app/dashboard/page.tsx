import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: proposalCount }, { count: clientCount }, { data: overdueInvoices }] =
    await Promise.all([
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('invoices').select('id, amount, currency').eq('user_id', user!.id).eq('status', 'overdue'),
    ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Proposals" value={proposalCount ?? 0} href="/dashboard/proposals" />
        <StatCard label="Clients" value={clientCount ?? 0} href="/dashboard/clients" />
        <StatCard
          label="Overdue Invoices"
          value={overdueInvoices?.length ?? 0}
          href="/dashboard/invoices"
          alert={!!overdueInvoices?.length}
        />
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/proposals/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New Proposal
        </Link>
        <Link
          href="/dashboard/clients"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add Client
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  alert = false,
}: {
  label: string
  value: number
  href: string
  alert?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 hover:bg-gray-50 ${alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </Link>
  )
}
