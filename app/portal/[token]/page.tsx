import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function symOf(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtAmt(n: number, currency: string) {
  return `${symOf(currency)}${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysOverdue(due: string) {
  return Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000)
}

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, company, email, phone, user_id')
    .eq('portal_token', params.token)
    .single()

  if (!client) return notFound()

  const [{ data: settings }, { data: invoices }, { data: proposals }, { data: contracts }] =
    await Promise.all([
      supabase.from('user_settings')
        .select('business_name, business_email, business_phone, logo_url')
        .eq('user_id', client.user_id)
        .single(),
      supabase.from('invoices')
        .select('id, invoice_number, amount, currency, status, due_date, created_at, public_token')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
      supabase.from('proposals')
        .select('id, title, brief_input, status, created_at, public_token')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
      supabase.from('contracts')
        .select('id, title, status, created_at, public_token, signed_at')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
    ])

  const allInvoices   = invoices  ?? []
  const allProposals  = proposals ?? []
  const allContracts  = contracts ?? []

  const overdueInvoices    = allInvoices.filter((i) => i.status === 'unpaid' && i.due_date < today)
  const unpaidInvoices     = allInvoices.filter((i) => i.status === 'unpaid' && i.due_date >= today)
  const pendingContracts   = allContracts.filter((c) => c.status === 'sent')
  const openProposals      = allProposals.filter((p) => p.status === 'sent')

  const needsAction = overdueInvoices.length + pendingContracts.length + openProposals.length

  const totalBilled   = allInvoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid     = allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalOverdue  = overdueInvoices.reduce((s, i) => s + i.amount, 0)
  const totalUnpaid   = unpaidInvoices.reduce((s, i) => s + i.amount, 0)
  const primaryCurrency = allInvoices[0]?.currency ?? 'NGN'

  const isEmpty = !allInvoices.length && !allProposals.length && !allContracts.length

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Business header */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-7 pt-7 pb-6">
            {settings?.business_name && (
              <div className="flex items-center gap-3 mb-5">
                {settings.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo_url} alt={settings.business_name} className="w-10 h-10 rounded-xl object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {settings.business_name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{settings.business_name}</p>
                  {settings.business_email && (
                    <p className="text-xs text-gray-400">{settings.business_email}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Client Portal</p>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{client.name}</h1>
                {client.company && <p className="text-sm text-gray-500 mt-0.5">{client.company}</p>}
                {client.email   && <p className="text-xs text-gray-400 mt-1">{client.email}</p>}
              </div>
            </div>
          </div>

          {/* Financial summary */}
          {totalBilled > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 divide-x divide-gray-100">
              {[
                { label: 'Total billed',  value: fmtAmt(totalBilled, primaryCurrency),  accent: 'text-gray-900' },
                { label: 'Paid',          value: fmtAmt(totalPaid, primaryCurrency),    accent: 'text-green-600' },
                { label: 'Unpaid',        value: fmtAmt(totalUnpaid, primaryCurrency),  accent: totalUnpaid > 0  ? 'text-amber-600' : 'text-gray-400' },
                { label: 'Overdue',       value: fmtAmt(totalOverdue, primaryCurrency), accent: totalOverdue > 0 ? 'text-red-600'   : 'text-gray-400' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="px-5 py-4">
                  <p className={`text-base font-bold tabular-nums leading-none ${accent}`}>{value}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action needed */}
        {needsAction > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-amber-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-widest">
                Action needed · {needsAction} item{needsAction !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-amber-100">
              {overdueInvoices.map((inv) => (
                <ActionRow
                  key={inv.id}
                  label={inv.invoice_number ?? 'Invoice'}
                  sub={`Overdue by ${daysOverdue(inv.due_date)} day${daysOverdue(inv.due_date) !== 1 ? 's' : ''}`}
                  right={fmtAmt(inv.amount, inv.currency)}
                  href={inv.public_token ? `/invoice/${inv.public_token}` : null}
                  cta="View invoice →"
                  ctaCls="bg-red-600 hover:bg-red-700 text-white"
                  accent="text-red-600"
                />
              ))}
              {pendingContracts.map((c) => (
                <ActionRow
                  key={c.id}
                  label={c.title ?? 'Contract'}
                  sub="Awaiting your signature"
                  href={c.public_token ? `/contract/${c.public_token}` : null}
                  cta="Sign contract →"
                  ctaCls="bg-gray-900 hover:bg-gray-700 text-white"
                />
              ))}
              {openProposals.map((p) => (
                <ActionRow
                  key={p.id}
                  label={p.title ?? (p.brief_input?.slice(0, 50) + '…') ?? 'Proposal'}
                  sub="Awaiting your review"
                  href={p.public_token ? `/proposal/${p.public_token}` : null}
                  cta="Review proposal →"
                  ctaCls="bg-gray-900 hover:bg-gray-700 text-white"
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Nothing here yet.</p>
            <p className="text-xs text-gray-400 mt-1">Invoices, proposals and contracts will appear here when they're sent to you.</p>
          </div>
        )}

        {/* Invoices */}
        {allInvoices.length > 0 && (
          <Section title="Invoices" count={allInvoices.length}>
            {allInvoices.map((inv) => {
              const isOverdue = inv.status === 'unpaid' && inv.due_date < today
              const displayStatus = isOverdue ? 'overdue' : inv.status
              const pillCls = {
                paid:      'bg-green-50 text-green-700',
                unpaid:    'bg-amber-50 text-amber-700',
                overdue:   'bg-red-50 text-red-600',
                cancelled: 'bg-gray-100 text-gray-400',
              }[displayStatus] ?? 'bg-gray-100 text-gray-400'
              return (
                <div key={inv.id} className={`flex items-center justify-between px-6 py-4 gap-3 ${isOverdue ? 'border-l-2 border-red-400' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number ?? 'Invoice'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isOverdue
                        ? <span className="text-red-500">Overdue {daysOverdue(inv.due_date)}d · due {fmtDate(inv.due_date)}</span>
                        : `Due ${fmtDate(inv.due_date)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtAmt(inv.amount, inv.currency)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${pillCls}`}>{displayStatus}</span>
                    {inv.public_token && (
                      <Link href={`/invoice/${inv.public_token}`} className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* Proposals */}
        {allProposals.length > 0 && (
          <Section title="Proposals" count={allProposals.length}>
            {allProposals.map((p) => {
              const title = p.title ?? (p.brief_input?.slice(0, 55) + '…') ?? 'Proposal'
              const pillCls = {
                draft:    'bg-gray-100 text-gray-500',
                sent:     'bg-blue-50 text-blue-600',
                accepted: 'bg-green-50 text-green-700',
                rejected: 'bg-red-50 text-red-500',
                expired:  'bg-orange-50 text-orange-500',
              }[p.status ?? 'draft'] ?? 'bg-gray-100 text-gray-500'
              const isSent = p.status === 'sent'
              return (
                <div key={p.id} className="flex items-center justify-between px-6 py-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${pillCls}`}>{p.status ?? 'draft'}</span>
                    {p.public_token && (
                      <Link href={`/proposal/${p.public_token}`}
                        className={`text-xs font-medium transition-colors ${isSent ? 'text-gray-900 underline underline-offset-2' : 'text-gray-400 hover:text-gray-900'}`}>
                        {isSent ? 'Review →' : 'View →'}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        {/* Contracts */}
        {allContracts.length > 0 && (
          <Section title="Contracts" count={allContracts.length}>
            {allContracts.map((c) => {
              const pillCls = {
                draft:  'bg-gray-100 text-gray-500',
                sent:   'bg-blue-50 text-blue-600',
                signed: 'bg-green-50 text-green-700',
              }[c.status ?? 'draft'] ?? 'bg-gray-100 text-gray-500'
              const isSent   = c.status === 'sent'
              const isSigned = c.status === 'signed'
              return (
                <div key={c.id} className={`flex items-center justify-between px-6 py-4 gap-3 ${isSent ? 'border-l-2 border-blue-400' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title ?? 'Contract'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isSigned && c.signed_at ? `Signed ${fmtDate(c.signed_at)}` : fmtDate(c.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${pillCls}`}>{c.status ?? 'draft'}</span>
                    {c.public_token && (
                      <Link href={`/contract/${c.public_token}`}
                        className={`text-xs font-medium transition-colors ${isSent ? 'text-gray-900 underline underline-offset-2' : 'text-gray-400 hover:text-gray-900'}`}>
                        {isSent ? 'Sign →' : 'View →'}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by <span className="font-medium text-gray-500">Soldr</span>
        </p>

      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function ActionRow({
  label, sub, right, href, cta, ctaCls, accent,
}: {
  label: string; sub: string; right?: string; href: string | null
  cta: string; ctaCls: string; accent?: string
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        <p className={`text-xs mt-0.5 ${accent ?? 'text-gray-500'}`}>{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {right && <p className="text-sm font-bold tabular-nums text-gray-900">{right}</p>}
        {href && (
          <Link href={href} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${ctaCls}`}>
            {cta}
          </Link>
        )}
      </div>
    </div>
  )
}
