import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { ProjectStatusButton } from '@/components/projects/ProjectStatusButton'
import { ProjectLinkPanel } from '@/components/projects/ProjectLinkPanel'

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }
const fmt = (amount: number, currency: string) =>
  `${SYMBOLS[currency] ?? currency}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PROPOSAL_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-500',
  expired:  'bg-orange-50 text-orange-500',
}
const INVOICE_BADGE: Record<string, string> = {
  unpaid:    'bg-amber-50 text-amber-700',
  paid:      'bg-green-50 text-green-700',
  overdue:   'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: project },
    { data: proposals },
    { data: invoices },
    { data: scopes },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients(id, name)').eq('id', params.id).eq('user_id', user!.id).single(),
    supabase.from('proposals').select('id, title, status, created_at').eq('project_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number, amount, currency, status, due_date, description').eq('project_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('scope_results').select('id, result, created_at').eq('project_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  const client = (Array.isArray(project.clients) ? project.clients[0] : project.clients) as { id: string; name: string } | null
  const today = new Date().toISOString().split('T')[0]

  // Financial summary
  const totalBilled = (invoices ?? []).reduce((s, inv) => s + (inv.status !== 'cancelled' ? inv.amount : 0), 0)
  const overdue = (invoices ?? []).filter((inv) => inv.status === 'unpaid' && inv.due_date < today)

  return (
    <PageContent>
      <div className="space-y-7">

        {/* Header */}
        <div>
          <Link href="/dashboard/projects" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Projects</Link>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 leading-snug">{project.name}</h1>
              {client && (
                <Link href={`/dashboard/clients/${client.id}`} className="text-sm text-gray-400 hover:text-gray-700 mt-0.5 inline-block transition-colors">
                  {client.name}
                </Link>
              )}
            </div>
            <ProjectStatusButton id={project.id} status={project.status} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Budget', value: project.budget != null ? fmt(project.budget, project.currency) : '—' },
            { label: 'Billed', value: invoices?.length ? fmt(totalBilled, (invoices[0]?.currency ?? project.currency)) : '—' },
            { label: 'Proposals', value: String(proposals?.length ?? 0) },
            { label: 'Overdue', value: String(overdue.length), warn: overdue.length > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Dates + Notes */}
        {(project.start_date || project.end_date || project.notes) && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
            {(project.start_date || project.end_date) && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Timeline: </span>
                {project.start_date ? new Date(project.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {' → '}
                {project.end_date ? new Date(project.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
              </p>
            )}
            {project.notes && <p className="text-sm text-gray-500">{project.notes}</p>}
          </div>
        )}

        {/* Link unlinked items */}
        <ProjectLinkPanel projectId={project.id} clientId={client?.id ?? null} />

        {/* Proposals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Proposals <span className="text-gray-400 font-normal">({proposals?.length ?? 0})</span></h2>
            <Link
              href={`/dashboard/proposals/new${client ? `?clientId=${client.id}` : ''}&projectId=${project.id}`}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              + New proposal
            </Link>
          </div>
          {!proposals?.length ? (
            <p className="text-sm text-gray-400 py-2">No proposals linked to this project.</p>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
              {proposals.map((p) => (
                <Link key={p.id} href={`/dashboard/proposals/${p.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <span className="text-sm font-medium text-gray-900 group-hover:underline underline-offset-2 truncate pr-4">{p.title ?? 'Untitled'}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${PROPOSAL_BADGE[p.status] ?? 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Invoices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Invoices <span className="text-gray-400 font-normal">({invoices?.length ?? 0})</span></h2>
            <Link
              href={`/dashboard/invoices/new${client ? `?clientId=${client.id}` : ''}&projectId=${project.id}`}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              + New invoice
            </Link>
          </div>
          {!invoices?.length ? (
            <p className="text-sm text-gray-400 py-2">No invoices linked to this project.</p>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
              {invoices.map((inv) => {
                const isOverdue = inv.status === 'unpaid' && inv.due_date < today
                const displayStatus = isOverdue ? 'overdue' : inv.status
                return (
                  <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium text-gray-900 group-hover:underline underline-offset-2 truncate">
                        {inv.invoice_number ? <span className="font-mono text-xs text-gray-500 mr-2">{inv.invoice_number}</span> : null}
                        {inv.description || 'Invoice'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Due {new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">{fmt(inv.amount, inv.currency)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${INVOICE_BADGE[displayStatus] ?? 'bg-gray-100 text-gray-500'}`}>{displayStatus}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Scope results */}
        {(scopes?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Scope checks <span className="text-gray-400 font-normal">({scopes!.length})</span></h2>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
              {scopes!.map((s) => (
                <Link key={s.id} href={`/dashboard/scope/${s.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <p className="text-sm text-gray-700 truncate pr-4 group-hover:underline underline-offset-2">
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">View →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </PageContent>
  )
}
