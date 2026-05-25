import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function sym(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtAmt(n: number, currency: string) {
  return `${sym(currency)}${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - Date.now()) / 86400000)
}

const PROPOSAL_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-500',
  expired:  'bg-orange-50 text-orange-500',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const today      = now.toISOString().slice(0, 10)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const yearStart  = `${now.getFullYear()}-01-01`
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
  const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [
    { data: unpaidInvoices },
    { data: recentProposals },
    { data: monthPayments },
    { data: yearPayments },
    { count: clientCount },
    { count: invoiceCount },
    // Needs-action queries
    { data: staleSentProposals },
    { data: unsignedContracts },
    { data: acceptedProposals },
    { data: dueSoonInvoices },
    { data: proposalsWithContracts },
    { data: proposalsWithInvoices },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, due_date, status, clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'unpaid')
      .order('due_date', { ascending: true }),
    supabase
      .from('proposals')
      .select('id, title, brief_input, status, created_at, clients(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('invoice_payments')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('paid_date', monthStart),
    supabase
      .from('invoice_payments')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('paid_date', yearStart),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    // Proposals sent > 3 days ago with no response
    supabase
      .from('proposals')
      .select('id, title, created_at, clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'sent')
      .lte('created_at', threeDaysAgo)
      .order('created_at', { ascending: true })
      .limit(5),
    // Contracts sent but not yet signed
    supabase
      .from('contracts')
      .select('id, title, created_at, clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: true })
      .limit(5),
    // Accepted proposals → need invoice or contract
    supabase
      .from('proposals')
      .select('id, title, accepted_at:updated_at, clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false })
      .limit(10),
    // Invoices due in next 7 days (not yet overdue)
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, due_date, clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'unpaid')
      .gt('due_date', today)
      .lte('due_date', sevenDaysOut)
      .order('due_date', { ascending: true })
      .limit(5),
    // Accepted proposals that already have a contract
    supabase
      .from('contracts')
      .select('proposal_id')
      .eq('user_id', user!.id)
      .not('proposal_id', 'is', null),
    // Accepted proposals that already have an invoice
    supabase
      .from('invoices')
      .select('proposal_id')
      .eq('user_id', user!.id)
      .not('proposal_id', 'is', null),
  ])

  // ─── Financials ──────────────────────────────────────────────────────────────
  const outstandingByCurrency: Record<string, number> = {}
  const overdueInvoices: typeof unpaidInvoices = []
  for (const inv of unpaidInvoices ?? []) {
    outstandingByCurrency[inv.currency] = (outstandingByCurrency[inv.currency] ?? 0) + inv.amount
    if (inv.due_date < today) overdueInvoices.push(inv)
  }
  const dominantCurrency = Object.entries(outstandingByCurrency).sort((a, b) => b[1] - a[1])[0]
  const outstandingTotal   = dominantCurrency?.[1] ?? 0
  const outstandingCurrency = dominantCurrency?.[0] ?? 'NGN'
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0)
  const monthTotal = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const yearTotal  = (yearPayments  ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)

  // ─── Needs action — accepted proposals not yet followed up ────────────────────
  const contractedProposalIds = new Set((proposalsWithContracts ?? []).map((c) => c.proposal_id))
  const invoicedProposalIds   = new Set((proposalsWithInvoices  ?? []).map((i) => i.proposal_id))
  const actionableAccepted = (acceptedProposals ?? []).filter(
    (p) => !contractedProposalIds.has(p.id) && !invoicedProposalIds.has(p.id)
  )

  // ─── All action items ────────────────────────────────────────────────────────
  type ActionItem =
    | { kind: 'overdue';   inv: NonNullable<typeof unpaidInvoices>[0] }
    | { kind: 'proposal';  p: NonNullable<typeof staleSentProposals>[0] }
    | { kind: 'contract';  c: NonNullable<typeof unsignedContracts>[0] }
    | { kind: 'accepted';  p: NonNullable<typeof acceptedProposals>[0] }
    | { kind: 'due-soon';  inv: NonNullable<typeof dueSoonInvoices>[0] }

  const actionItems: ActionItem[] = [
    ...(overdueInvoices.slice(0, 4).map((inv) => ({ kind: 'overdue' as const, inv }))),
    ...(actionableAccepted.slice(0, 3).map((p) => ({ kind: 'accepted' as const, p }))),
    ...(unsignedContracts ?? []).slice(0, 3).map((c) => ({ kind: 'contract' as const, c })),
    ...(staleSentProposals ?? []).slice(0, 3).map((p) => ({ kind: 'proposal' as const, p })),
    ...(dueSoonInvoices ?? []).slice(0, 3).map((inv) => ({ kind: 'due-soon' as const, inv })),
  ]

  const stats = [
    {
      label: 'Outstanding',
      value: outstandingTotal > 0 ? fmtAmt(outstandingTotal, outstandingCurrency) : '—',
      sub: `${unpaidInvoices?.length ?? 0} unpaid invoice${(unpaidInvoices?.length ?? 0) === 1 ? '' : 's'}`,
      cls: 'text-gray-900',
    },
    {
      label: 'Overdue',
      value: overdueTotal > 0 ? fmtAmt(overdueTotal, outstandingCurrency) : '—',
      sub: overdueInvoices.length > 0 ? `${overdueInvoices.length} past due` : 'All on time',
      cls: overdueTotal > 0 ? 'text-red-600' : 'text-gray-400',
    },
    {
      label: 'Collected this month',
      value: monthTotal > 0 ? fmtAmt(monthTotal, outstandingCurrency) : '—',
      sub: 'via recorded payments',
      cls: 'text-green-600',
    },
    {
      label: 'YTD revenue',
      value: yearTotal > 0 ? fmtAmt(yearTotal, outstandingCurrency) : '—',
      sub: `${now.getFullYear()}`,
      cls: 'text-gray-900',
    },
  ]

  return (
    <PageContent>
      <div className="space-y-7">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {(clientCount ?? 0) > 0 && <> · {clientCount} client{clientCount === 1 ? '' : 's'}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/invoices/new" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              New invoice
            </Link>
            <Link href="/dashboard/proposals/new" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              New proposal
            </Link>
          </div>
        </div>

        <OnboardingBanner
          hasClient={(clientCount ?? 0) > 0}
          hasProposal={(recentProposals?.length ?? 0) > 0}
          hasInvoice={(invoiceCount ?? 0) > 0}
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, sub, cls }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
              <p className={`text-2xl font-bold tabular-nums leading-none ${cls}`}>{value}</p>
              <p className="mt-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Needs action */}
        {actionItems.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <span className="inline-flex w-4 h-4 rounded-full bg-gray-900 items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">{actionItems.length}</span>
              </span>
              <p className="text-sm font-semibold text-gray-900">Needs action</p>
            </div>
            <div className="divide-y divide-gray-50">
              {actionItems.map((item, idx) => {
                if (item.kind === 'overdue') {
                  const { inv } = item
                  const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
                  const days = daysAgo(inv.due_date + 'T00:00:00')
                  return (
                    <div key={`ov-${inv.id}`} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Invoice overdue · {client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">{days}d past due · {fmtAmt(inv.amount, inv.currency)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/nudge/new?invoiceId=${inv.id}`}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                          Nudge
                        </Link>
                        <Link href={`/dashboard/invoices/${inv.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'accepted') {
                  const { p } = item
                  const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as { name: string } | null
                  return (
                    <div key={`acc-${p.id}`} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Proposal accepted · {client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.title ?? 'Untitled proposal'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/contracts/new?proposalId=${p.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                          Contract
                        </Link>
                        <Link href={`/dashboard/invoices/new?proposalId=${p.id}`}
                          className="rounded-lg bg-gray-900 border border-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors">
                          Invoice
                        </Link>
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'contract') {
                  const { c } = item
                  const client = (Array.isArray(c.clients) ? c.clients[0] : c.clients) as { name: string } | null
                  const days = daysAgo(c.created_at)
                  return (
                    <div key={`ct-${c.id}`} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Awaiting signature · {client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Sent {days}d ago · {c.title ?? 'Service Agreement'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/contracts/${c.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'proposal') {
                  const { p } = item
                  const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as { name: string } | null
                  const days = daysAgo(p.created_at)
                  return (
                    <div key={`sp-${p.id}`} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          No response · {client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Sent {days}d ago · proposal still open</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/proposals/${p.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'due-soon') {
                  const { inv } = item
                  const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
                  const days = daysUntil(inv.due_date)
                  return (
                    <div key={`ds-${inv.id}`} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-2 h-2 rounded-full bg-orange-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Due {days === 0 ? 'today' : `in ${days}d`} · {client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtAmt(inv.amount, inv.currency)} · {inv.invoice_number ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/dashboard/invoices/${inv.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>
        )}

        {/* Two-column: proposals + unpaid invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent proposals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent proposals</p>
              <Link href="/dashboard/proposals" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">View all →</Link>
            </div>
            {!recentProposals?.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">No proposals yet.</p>
                <Link href="/dashboard/proposals/new" className="mt-1 inline-block text-sm font-medium text-gray-900 hover:underline">Write your first →</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
                {recentProposals.map((p) => {
                  const client = p.clients as unknown as { name: string } | null
                  const title = p.title ?? (p.brief_input?.slice(0, 50) + '…')
                  const badgeCls = PROPOSAL_BADGE[p.status ?? 'draft'] ?? PROPOSAL_BADGE.draft
                  return (
                    <Link key={p.id} href={`/dashboard/proposals/${p.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                        {client?.name && <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${badgeCls}`}>
                        {p.status ?? 'draft'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unpaid invoices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Unpaid invoices</p>
              <Link href="/dashboard/invoices" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">View all →</Link>
            </div>
            {!unpaidInvoices?.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">All invoices collected.</p>
                <Link href="/dashboard/invoices/new" className="mt-1 inline-block text-sm font-medium text-gray-900 hover:underline">Create invoice →</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
                {unpaidInvoices.slice(0, 6).map((inv) => {
                  const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
                  const isOverdue = inv.due_date < today
                  const days = isOverdue ? daysAgo(inv.due_date + 'T00:00:00') : daysUntil(inv.due_date)
                  const dueLabel = isOverdue
                    ? `${days}d overdue`
                    : days === 0 ? 'due today'
                    : `due in ${days}d`
                  return (
                    <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{client?.name ?? '—'}</p>
                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{dueLabel}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                        {fmtAmt(inv.amount, inv.currency)}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContent>
  )
}
