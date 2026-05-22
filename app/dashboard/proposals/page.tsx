import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProposalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, brief_input, created_at, clients(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Proposals</h1>
        <Link href="/dashboard/proposals/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          New proposal
        </Link>
      </div>

      {!proposals?.length ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No proposals yet.</p>
          <Link href="/dashboard/proposals/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Write your first one →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const client = p.clients as unknown as { name: string } | null
                const title = p.title ?? p.brief_input?.slice(0, 60) + '…'
                const date = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/proposals/${p.id}`} className="font-medium text-gray-900 hover:underline">{title}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{date}</td>
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
