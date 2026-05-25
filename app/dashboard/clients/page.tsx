import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, company, status, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <PageContent>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Clients</h1>
          <p className="mt-0.5 text-sm text-gray-400">{clients?.length ?? 0} client{clients?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/clients/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          Add client
        </Link>
      </div>

      {!clients?.length ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No clients yet.</p>
          <Link href="/dashboard/clients/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Add your first client →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Added</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-gray-900 hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${c.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                      ● {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton endpoint={`/api/clients/${c.id}`} />
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
