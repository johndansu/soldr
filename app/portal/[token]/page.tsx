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

const INVOICE_PILL: Record<string, string> = {
  paid:      'bg-green-50 text-green-700',
  unpaid:    'bg-amber-50 text-amber-700',
  overdue:   'bg-red-50 text-red-600',
  cancelled: 'bg-gray-100 text-gray-400',
}
const PROPOSAL_PILL: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-500',
  sent:     'bg-blue-50 text-blue-600',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-500',
  expired:  'bg-orange-50 text-orange-500',
}
const CONTRACT_PILL: Record<string, string> = {
  draft:  'bg-gray-100 text-gray-500',
  sent:   'bg-blue-50 text-blue-600',
  signed: 'bg-green-50 text-green-700',
}

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, company, email, user_id')
    .eq('portal_token', params.token)
    .single()

  if (!client) return notFound()

  const [{ data: settings }, { data: invoices }, { data: proposals }, { data: contracts }] =
    await Promise.all([
      supabase.from('user_settings')
        .select('business_name, business_email, logo_url')
        .eq('user_id', client.user_id)
        .single(),
      supabase.from('invoices')
        .select('id, invoice_number, amount, currency, status, due_date, public_token')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
      supabase.from('proposals')
        .select('id, title, brief_input, status, created_at, public_token')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
      supabase.from('contracts')
        .select('id, title, status, created_at, public_token')
        .eq('client_id', client.id)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
    ])

  const totalBilled = (invoices ?? []).reduce((s, i) => s + i.amount, 0)
  const totalPaid   = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const outstanding = (invoices ?? []).filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0)
  const primaryCurrency = invoices?.[0]?.currency ?? 'NGN'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-7 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              {settings?.business_name && (
                <div className="flex items-center gap-2.5 mb-3">
                  {settings.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logo_url} alt={settings.business_name} className="w-7 h-7 rounded-lg object-contain" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {settings.business_name[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-900">{settings.business_name}</span>
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              {client.company && <p className="text-sm text-gray-500 mt-0.5">{client.company}</p>}
              {client.email   && <p className="text-sm text-gray-400 mt-0.5">{client.email}</p>}
            </div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right shrink-0">Client Portal</p>
          </div>

          {(invoices?.length ?? 0) > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
              {[
                { label: 'Total billed',   value: fmtAmt(totalBilled, primaryCurrency), accent: 'text-gray-900' },
                { label: 'Paid',           value: fmtAmt(totalPaid, primaryCurrency),   accent: 'text-green-600' },
                { label: 'Outstanding',    value: fmtAmt(outstanding, primaryCurrency), accent: outstanding > 0 ? 'text-amber-600' : 'text-gray-400' },
              ].map(({ label, value, accent }) => (
                <div key={label}>
                  <p className={`text-lg font-bold tabular-nums ${accent}`}>{value}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <Section title="Invoices" count={invoices?.length ?? 0}>
          {!invoices?.length ? (
            <Empty text="No invoices yet." />
          ) : (
            invoices.map((inv) => {
              const isOverdue = inv.status === 'unpaid' && inv.due_date < today
              const displayStatus = isOverdue ? 'overdue' : inv.status
              const pill = INVOICE_PILL[displayStatus] ?? INVOICE_PILL.unpaid
              const href = inv.public_token ? `/invoice/${inv.public_token}` : null
              return (
                <Row
                  key={inv.id}
                  href={href}
                  label={inv.invoice_number ?? `Invoice`}
                  sub={`Due ${fmtDate(inv.due_date)}`}
                  right={fmtAmt(inv.amount, inv.currency)}
                  pill={displayStatus}
                  pillCls={pill}
                  linkText={href ? 'View →' : undefined}
                />
              )
            })
          )}
        </Section>

        {/* Proposals */}
        <Section title="Proposals" count={proposals?.length ?? 0}>
          {!proposals?.length ? (
            <Empty text="No proposals yet." />
          ) : (
            proposals.map((p) => {
              const title = p.title ?? (p.brief_input?.slice(0, 50) + '…') ?? 'Proposal'
              const pill = PROPOSAL_PILL[p.status ?? 'draft'] ?? PROPOSAL_PILL.draft
              const href = p.public_token ? `/proposal/${p.public_token}` : null
              return (
                <Row
                  key={p.id}
                  href={href}
                  label={title}
                  sub={fmtDate(p.created_at)}
                  pill={p.status ?? 'draft'}
                  pillCls={pill}
                  linkText={href ? 'View →' : undefined}
                />
              )
            })
          )}
        </Section>

        {/* Contracts */}
        <Section title="Contracts" count={contracts?.length ?? 0}>
          {!contracts?.length ? (
            <Empty text="No contracts yet." />
          ) : (
            contracts.map((c) => {
              const pill = CONTRACT_PILL[c.status ?? 'draft'] ?? CONTRACT_PILL.draft
              const href = c.public_token ? `/contract/${c.public_token}` : null
              return (
                <Row
                  key={c.id}
                  href={href}
                  label={c.title ?? 'Contract'}
                  sub={fmtDate(c.created_at)}
                  pill={c.status ?? 'draft'}
                  pillCls={pill}
                  linkText={href && c.status === 'sent' ? 'Sign →' : href ? 'View →' : undefined}
                />
              )
            })
          )}
        </Section>

        {/* Footer */}
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
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function Row({
  href, label, sub, right, pill, pillCls, linkText,
}: {
  href: string | null
  label: string
  sub: string
  right?: string
  pill: string
  pillCls: string
  linkText?: string
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {right && <p className="text-sm font-semibold text-gray-900 tabular-nums">{right}</p>}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${pillCls}`}>{pill}</span>
        {linkText && href && (
          <Link href={href} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
            {linkText}
          </Link>
        )}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
