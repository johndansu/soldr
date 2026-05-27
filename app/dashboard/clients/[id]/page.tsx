import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientNotes } from '@/components/clients/ClientNotes'
import { PageContent } from '@/components/ui/PageContent'
import { CopyButton } from '@/components/ui/CopyButton'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function fmtAmt(n: number, currency: string) {
  const s = CURRENCY_SYMBOLS[currency] ?? currency
  return `${s}${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const PROPOSAL_STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-500',
  expired:  'bg-orange-50 text-orange-500',
}
const INVOICE_STATUS_PILL: Record<string, string> = {
  paid:      'bg-green-50 text-green-700',
  unpaid:    'bg-amber-50 text-amber-700',
  overdue:   'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: client }, { data: notes }, { data: proposals }, { data: invoices }, { data: payments }] =
    await Promise.all([
      supabase.from('clients').select('*, portal_token').eq('id', params.id).eq('user_id', user!.id).single(),
      supabase.from('client_notes').select('id, content, created_at').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('proposals').select('id, title, brief_input, status, created_at').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, invoice_number, amount, currency, status, due_date, created_at').eq('client_id', params.id).eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('invoice_payments').select('amount, invoice_id').eq('user_id', user!.id),
    ])

  if (!client) notFound()

  // Financial summary
  const totalBilled   = (invoices ?? []).reduce((s, i) => s + i.amount, 0)
  const totalPaid     = (payments ?? []).reduce((s, p) => s + p.amount, 0)
  const outstanding   = (invoices ?? []).filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0)
  const primaryCurrency = invoices?.[0]?.currency ?? 'NGN'

  const overdueCount  = (invoices ?? []).filter((i) => i.status === 'unpaid' && i.due_date < today).length

  return (
    <PageContent>
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/clients" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← Clients
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">{client.name}</h1>
          {client.company && <p className="mt-0.5 text-sm text-gray-500">{client.company}</p>}
          {client.email   && <p className="text-sm text-gray-400">{client.email}</p>}
          {client.phone   && <p className="text-sm text-gray-400">{client.phone}</p>}
        </div>
        <div className="flex items-center gap-2 mt-6">
          {client.portal_token && (
            <CopyButton
              text={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portal/${client.portal_token}`}
              label="Share portal"
            />
          )}
          <Link href={`/dashboard/proposals/new?clientId=${client.id}`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            New proposal
          </Link>
          <Link href={`/dashboard/invoices/new?clientId=${client.id}`}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            New invoice
          </Link>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total billed',   value: totalBilled > 0   ? fmtAmt(totalBilled, primaryCurrency)   : '—', accent: 'text-gray-900' },
          { label: 'Collected',      value: totalPaid > 0     ? fmtAmt(totalPaid, primaryCurrency)      : '—', accent: 'text-green-600' },
          { label: 'Outstanding',    value: outstanding > 0   ? fmtAmt(outstanding, primaryCurrency)   : '—', accent: outstanding > 0 ? 'text-gray-900' : 'text-gray-400' },
          { label: 'Overdue',        value: overdueCount > 0  ? `${overdueCount} invoice${overdueCount === 1 ? '' : 's'}` : 'None', accent: overdueCount > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-4">
            <p className={`text-xl font-bold tabular-nums leading-none ${accent}`}>{value}</p>
            <p className="mt-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Proposals + Invoices side by side */}
      <div className="grid grid-cols-2 gap-6">

        {/* Proposals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Proposals ({proposals?.length ?? 0})</p>
            <Link href={`/dashboard/proposals/new?clientId=${client.id}`}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">+ New</Link>
          </div>
          {!proposals?.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">No proposals yet.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
              {proposals.map((p) => {
                const title = p.title ?? (p.brief_input?.slice(0, 45) + '…')
                const status = p.status ?? 'draft'
                const badgeCls = PROPOSAL_STATUS_BADGE[status] ?? PROPOSAL_STATUS_BADGE.draft
                const date = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <Link key={p.id} href={`/dashboard/proposals/${p.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${badgeCls}`}>
                      {status}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Invoices ({invoices?.length ?? 0})</p>
            <Link href={`/dashboard/invoices/new?clientId=${client.id}`}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">+ New</Link>
          </div>
          {!invoices?.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">No invoices yet.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
              {invoices.map((inv) => {
                const isOverdue = inv.status === 'unpaid' && inv.due_date < today
                const displayStatus = isOverdue ? 'overdue' : inv.status
                const pillCls = INVOICE_STATUS_PILL[displayStatus] ?? INVOICE_STATUS_PILL.unpaid
                const date = new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-2 hover:bg-gray-50 transition-colors">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between flex-1 gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 tabular-nums">{fmtAmt(inv.amount, inv.currency)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.invoice_number ?? date}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${pillCls}`}>
                        {displayStatus}
                      </span>
                    </Link>
                    {isOverdue && (
                      <Link
                        href={`/dashboard/nudge/new?invoiceId=${inv.id}`}
                        className="shrink-0 rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Nudge
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <ClientNotes clientId={params.id} initialNotes={notes ?? []} />
    </div>
    </PageContent>
  )
}
