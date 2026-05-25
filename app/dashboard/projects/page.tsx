import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { ProjectStatusButton } from '@/components/projects/ProjectStatusButton'
import { DeleteButton } from '@/components/ui/DeleteButton'

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-green-50 text-green-700',
  completed: 'bg-blue-50 text-blue-700',
  paused:    'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }
const fmt = (amount: number | null, currency: string) =>
  amount == null ? '—' : `${SYMBOLS[currency] ?? currency}${amount.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, budget, currency, start_date, end_date, created_at, clients(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const counts = {
    active:    (projects ?? []).filter((p) => p.status === 'active').length,
    completed: (projects ?? []).filter((p) => p.status === 'completed').length,
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Projects</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {counts.active} active{counts.completed > 0 ? ` · ${counts.completed} completed` : ''}
            </p>
          </div>
          <Link href="/dashboard/projects/new"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            New project
          </Link>
        </div>

        {!projects?.length ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-400">No projects yet.</p>
            <p className="mt-1 text-xs text-gray-400">A project ties your proposal, scope, invoices, and payments into one view.</p>
            <Link href="/dashboard/projects/new" className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline">
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as { name: string } | null
              const statusCls = STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-500'
              return (
                <div key={p.id} className="group relative rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/projects/${p.id}`} className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 leading-snug group-hover:underline underline-offset-2 truncate">{p.name}</p>
                      {client && <p className="text-xs text-gray-400 mt-0.5 truncate">{client.name}</p>}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusCls}`}>{p.status}</span>
                  </div>

                  {/* Budget */}
                  {p.budget != null && (
                    <p className="text-sm font-medium text-gray-700 tabular-nums">{fmt(p.budget, p.currency)} budget</p>
                  )}

                  {/* Dates */}
                  {(p.start_date || p.end_date) && (
                    <p className="text-xs text-gray-400">
                      {p.start_date ? new Date(p.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' → '}
                      {p.end_date ? new Date(p.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                    </p>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-1 mt-auto border-t border-gray-50">
                    <ProjectStatusButton id={p.id} status={p.status as 'active' | 'completed' | 'paused' | 'cancelled'} />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteButton endpoint={`/api/projects/${p.id}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageContent>
  )
}
