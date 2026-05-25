import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-500',
  expired:  'bg-orange-50 text-orange-500',
}

export default async function ProposalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, brief_input, status, created_at, clients(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <PageContent>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Proposals</h1>
        <Link href="/dashboard/proposals/new" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
          New proposal
        </Link>
      </div>

      {!proposals?.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No proposals yet.</p>
          <Link href="/dashboard/proposals/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Write your first one →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Title</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Date</th>
                <th aria-label="Actions" title="Actions" />
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const client = p.clients as unknown as { name: string } | null
                const title = p.title ?? (p.brief_input?.slice(0, 60) + '…')
                const date = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                const status = p.status ?? 'draft'
                const badgeCls = STATUS_BADGE[status] ?? STATUS_BADGE.draft
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/proposals/${p.id}`} className="font-medium text-gray-900 hover:underline">{title}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{client?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${badgeCls}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{date}</td>
                    <td className="px-4 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton endpoint={`/api/proposals/${p.id}`} />
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
