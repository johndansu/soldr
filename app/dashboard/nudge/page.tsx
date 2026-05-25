import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'

export default async function NudgePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: nudges } = await supabase
    .from('nudge_results')
    .select('id, context, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Nudge</h1>
            <p className="mt-0.5 text-sm text-gray-400">{nudges?.length ?? 0} saved</p>
          </div>
          <Link href="/dashboard/nudge/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            New nudge
          </Link>
        </div>

        {!nudges?.length ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-400">No nudges saved yet.</p>
            <Link href="/dashboard/nudge/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
              Generate your first →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Context</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {nudges.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/nudge/${n.id}`} className="font-medium text-gray-900 hover:underline line-clamp-1">
                        {n.context}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton endpoint={`/api/nudge/${n.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContent>
  )
}
