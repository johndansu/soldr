import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'

const VERDICT_LABEL: Record<string, { label: string; color: string }> = {
  in_scope:            { label: 'In Scope',           color: 'text-green-600' },
  out_of_scope:        { label: 'Out of Scope',        color: 'text-red-600' },
  needs_clarification: { label: 'Needs Clarification', color: 'text-amber-600' },
}

export default async function ScopePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: checks } = await supabase
    .from('scope_results')
    .select('id, client_message, verdict, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Scope Check</h1>
            <p className="mt-0.5 text-sm text-gray-400">{checks?.length ?? 0} saved</p>
          </div>
          <Link href="/dashboard/scope/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            New check
          </Link>
        </div>

        {!checks?.length ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-400">No scope checks saved yet.</p>
            <Link href="/dashboard/scope/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
              Run your first check →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Verdict</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => {
                  const meta = VERDICT_LABEL[c.verdict] ?? { label: c.verdict, color: 'text-gray-500' }
                  return (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/scope/${c.id}`} className="font-medium text-gray-900 hover:underline line-clamp-1">
                          {c.client_message}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${meta.color}`}>● {meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteButton endpoint={`/api/scope/${c.id}`} />
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
