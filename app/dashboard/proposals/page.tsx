import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-600',
  accepted: 'bg-green-100 text-green-600',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-yellow-100 text-yellow-600',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <Link
          href="/dashboard/proposals/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New proposal
        </Link>
      </div>

      {!proposals?.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">No proposals yet.</p>
          <Link
            href="/dashboard/proposals/new"
            className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            Write your first one →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {proposals.map((p) => {
            const client = p.clients as unknown as { name: string } | null
            const title = p.title ?? p.brief_input.slice(0, 60) + '…'
            const date = new Date(p.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })

            return (
              <Link
                key={p.id}
                href={`/dashboard/proposals/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">
                    {client?.name ? `${client.name} · ` : ''}{date}
                  </p>
                </div>
                <span className={`ml-4 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? STATUS_STYLES.draft}`}>
                  {p.status}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
