import { createClient } from '@/lib/supabase/server'
import { PageContent } from '@/components/ui/PageContent'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function sym(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtAmt(n: number, c: string) {
  return `${sym(c)}${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtMonth(y: number, m: number) {
  return new Date(y, m - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [
    { data: invoices },
    { data: clients },
    { data: proposals },
    { data: recurringTemplates },
  ] = await Promise.all([
    supabase.from('invoices')
      .select('id, client_id, amount, currency, status, due_date, created_at')
      .eq('user_id', user!.id),
    supabase.from('clients')
      .select('id, name')
      .eq('user_id', user!.id),
    supabase.from('proposals')
      .select('id, status, created_at')
      .eq('user_id', user!.id),
    supabase.from('invoice_templates')
      .select('amount, currency, next_run_date, frequency')
      .eq('user_id', user!.id)
      .eq('active', true),
  ])

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]))

  // ── Client LTV ──────────────────────────────────────────────────────────────
  const ltvMap = new Map<string, { name: string; byCurrency: Map<string, { billed: number; paid: number; count: number }> }>()
  for (const inv of invoices ?? []) {
    if (!inv.client_id) continue
    if (!ltvMap.has(inv.client_id)) {
      ltvMap.set(inv.client_id, { name: clientMap.get(inv.client_id) ?? 'Unknown', byCurrency: new Map() })
    }
    const entry = ltvMap.get(inv.client_id)!
    if (!entry.byCurrency.has(inv.currency)) {
      entry.byCurrency.set(inv.currency, { billed: 0, paid: 0, count: 0 })
    }
    const cur = entry.byCurrency.get(inv.currency)!
    cur.billed += inv.amount
    if (inv.status === 'paid') cur.paid += inv.amount
    cur.count++
  }

  // Sort by highest billed (using first currency)
  const ltvRows = [...ltvMap.entries()]
    .map(([id, { name, byCurrency }]) => ({
      id, name,
      currencies: [...byCurrency.entries()].sort((a, b) => b[1].billed - a[1].billed),
    }))
    .sort((a, b) => b.currencies[0]?.[1].billed - a.currencies[0]?.[1].billed)

  const maxBilled = Math.max(...ltvRows.map((r) => r.currencies[0]?.[1].billed ?? 0), 1)

  // ── Proposal Funnel ──────────────────────────────────────────────────────────
  const statusCounts = { draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 }
  for (const p of proposals ?? []) {
    const s = (p.status ?? 'draft') as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  }
  const totalActive = statusCounts.sent + statusCounts.accepted + statusCounts.rejected + statusCounts.expired
  const winRate = totalActive > 0 ? Math.round((statusCounts.accepted / totalActive) * 100) : null

  // Monthly proposals (last 6 months)
  const now = new Date()
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i)
    return { year: d.getFullYear(), month: d.getMonth() + 1, sent: 0, accepted: 0 }
  })
  for (const p of proposals ?? []) {
    const d = new Date(p.created_at)
    const m = months6.find((x) => x.year === d.getFullYear() && x.month === d.getMonth() + 1)
    if (!m) continue
    if (p.status !== 'draft') m.sent++
    if (p.status === 'accepted') m.accepted++
  }
  const maxMonthSent = Math.max(...months6.map((m) => m.sent), 1)

  // ── Revenue Forecast (next 6 months) ────────────────────────────────────────
  // Slots: current month + next 5
  const forecastSlots = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      confirmed: new Map<string, number>(), // unpaid invoices due this month
      recurring: new Map<string, number>(), // recurring templates
    }
  })

  // Unpaid invoices due within next 6 months
  const forecastEnd = new Date(today.getFullYear(), today.getMonth() + 6, 1).toISOString().split('T')[0]
  for (const inv of invoices ?? []) {
    if (inv.status !== 'unpaid') continue
    if (inv.due_date < todayStr || inv.due_date >= forecastEnd) continue
    const d = new Date(inv.due_date)
    const slot = forecastSlots.find((s) => s.year === d.getFullYear() && s.month === d.getMonth() + 1)
    if (!slot) continue
    slot.confirmed.set(inv.currency, (slot.confirmed.get(inv.currency) ?? 0) + inv.amount)
  }

  // Recurring templates — project next occurrences
  for (const tpl of recurringTemplates ?? []) {
    if (!tpl.next_run_date) continue
    // Project forward based on frequency
    const freqMonths: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12, weekly: 0 }
    const step = freqMonths[tpl.frequency] ?? 1
    let d = new Date(tpl.next_run_date)
    for (let i = 0; i < 12; i++) { // iterate enough times to cover 6 months
      const slot = forecastSlots.find((s) => s.year === d.getFullYear() && s.month === d.getMonth() + 1)
      if (slot) {
        slot.recurring.set(tpl.currency, (slot.recurring.get(tpl.currency) ?? 0) + tpl.amount)
      }
      if (step === 0) break // weekly — skip for simplicity
      d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate())
      if (d > new Date(today.getFullYear(), today.getMonth() + 6)) break
    }
  }

  // Find primary currency for forecast display
  const allForecastAmts = new Map<string, number>()
  for (const slot of forecastSlots) {
    for (const [c, amt] of slot.confirmed) allForecastAmts.set(c, (allForecastAmts.get(c) ?? 0) + amt)
    for (const [c, amt] of slot.recurring) allForecastAmts.set(c, (allForecastAmts.get(c) ?? 0) + amt)
  }
  const primaryForecastCurrency = [...allForecastAmts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NGN'
  const maxForecast = Math.max(...forecastSlots.map((s) =>
    (s.confirmed.get(primaryForecastCurrency) ?? 0) + (s.recurring.get(primaryForecastCurrency) ?? 0)
  ), 1)

  const hasLTV      = ltvRows.length > 0
  const hasProposals = (proposals?.length ?? 0) > 0
  const hasForecast  = forecastSlots.some((s) => s.confirmed.size > 0 || s.recurring.size > 0)

  return (
    <PageContent>
      <div className="space-y-8">

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-gray-400">Client value, proposal performance, and revenue forecast.</p>
        </div>

        {/* ── Client Lifetime Value ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Client lifetime value</h2>
          {!hasLTV ? (
            <Empty text="No invoices yet." />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">Client</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400">Billed</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Collected</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Invoices</th>
                    <th className="px-5 py-3 w-32 hidden md:table-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ltvRows.map((row) => {
                    const [primaryCur, primary] = row.currencies[0] ?? ['NGN', { billed: 0, paid: 0, count: 0 }]
                    const barPct = Math.round((primary.billed / maxBilled) * 100)
                    const outstanding = primary.billed - primary.paid
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-900">{row.name}</p>
                          {row.currencies.length > 1 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {row.currencies.slice(1).map(([c, v]) => fmtAmt(v.billed, c)).join(' + ')} other
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtAmt(primary.billed, primaryCur)}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <p className="text-sm text-green-600 tabular-nums">{fmtAmt(primary.paid, primaryCur)}</p>
                          {outstanding > 0 && <p className="text-xs text-amber-500 tabular-nums mt-0.5">{fmtAmt(outstanding, primaryCur)} due</p>}
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <p className="text-sm text-gray-500">{primary.count}</p>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${barPct}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Proposal Funnel ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Proposal conversion</h2>
          {!hasProposals ? (
            <Empty text="No proposals yet." />
          ) : (
            <div className="space-y-3">
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total sent',   value: totalActive,              accent: 'text-gray-900' },
                  { label: 'Accepted',     value: statusCounts.accepted,    accent: 'text-green-600' },
                  { label: 'Rejected',     value: statusCounts.rejected,    accent: statusCounts.rejected > 0 ? 'text-red-500' : 'text-gray-400' },
                  { label: 'Win rate',     value: winRate !== null ? `${winRate}%` : '—', accent: winRate !== null && winRate >= 50 ? 'text-green-600' : 'text-gray-900' },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
                    <p className={`text-2xl font-bold tabular-nums leading-none ${accent}`}>{value}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Status breakdown */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 mb-4">Status breakdown</p>
                <div className="space-y-3">
                  {(Object.entries(statusCounts) as [string, number][])
                    .filter(([, v]) => v > 0)
                    .map(([status, count]) => {
                      const total = proposals?.length ?? 1
                      const pct = Math.round((count / total) * 100)
                      const color: Record<string, string> = {
                        accepted: 'bg-green-500', sent: 'bg-blue-400',
                        draft: 'bg-gray-200', rejected: 'bg-red-400', expired: 'bg-orange-300',
                      }
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <p className="text-xs text-gray-500 capitalize w-16 shrink-0">{status}</p>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color[status] ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{count}</p>
                          <p className="text-xs text-gray-400 w-8 text-right">{pct}%</p>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Monthly trend */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 mb-4">Monthly — last 6 months</p>
                <div className="flex items-end gap-2 h-24">
                  {months6.map((m) => {
                    const sentH  = maxMonthSent > 0 ? Math.round((m.sent / maxMonthSent) * 80) : 0
                    const acceptH = m.sent > 0 ? Math.round((m.accepted / m.sent) * sentH) : 0
                    return (
                      <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                          <div className="w-full relative rounded-t-sm overflow-hidden" style={{ height: Math.max(sentH, 2) }}>
                            <div className="absolute inset-0 bg-gray-100" />
                            <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-sm" style={{ height: `${acceptH}px` }} />
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center leading-tight">
                          {fmtMonth(m.year, m.month).split(' ')[0]}
                        </p>
                        {m.sent > 0 && <p className="text-[9px] font-semibold text-gray-600">{m.sent}</p>}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" /> Sent
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Accepted
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Revenue Forecast ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Revenue forecast — next 6 months</h2>
          {!hasForecast ? (
            <Empty text="No upcoming invoices or recurring templates." />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-6 divide-x divide-gray-100">
                {forecastSlots.map((slot) => {
                  const confirmed = slot.confirmed.get(primaryForecastCurrency) ?? 0
                  const recurring = slot.recurring.get(primaryForecastCurrency) ?? 0
                  const total = confirmed + recurring
                  const totalH = Math.round((total / maxForecast) * 80)
                  const confirmedH = total > 0 ? Math.round((confirmed / total) * totalH) : 0
                  const recurringH = totalH - confirmedH
                  const isCurrentMonth = slot.year === today.getFullYear() && slot.month === today.getMonth() + 1
                  return (
                    <div key={`${slot.year}-${slot.month}`} className={`px-3 py-4 flex flex-col items-center gap-2 ${isCurrentMonth ? 'bg-gray-50' : ''}`}>
                      <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 80 }}>
                        {confirmedH > 0 && (
                          <div className="w-3 bg-gray-900 rounded-t-sm" style={{ height: Math.max(confirmedH, 2) }} title="Confirmed (unpaid invoices)" />
                        )}
                        {recurringH > 0 && (
                          <div className="w-3 bg-gray-300 rounded-t-sm" style={{ height: Math.max(recurringH, 2) }} title="Recurring templates" />
                        )}
                        {total === 0 && (
                          <div className="w-3 bg-gray-100 rounded-t-sm" style={{ height: 2 }} />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-400">{fmtMonth(slot.year, slot.month).split(' ')[0]}</p>
                        {total > 0 && (
                          <p className="text-xs font-bold text-gray-900 tabular-nums mt-0.5">{fmtAmt(total, primaryForecastCurrency)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-5">
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-900 inline-block" /> Confirmed invoices
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" /> Recurring
                </span>
                <span className="ml-auto text-[10px] text-gray-400">Showing {sym(primaryForecastCurrency)}</span>
              </div>
            </div>
          )}
        </section>

      </div>
    </PageContent>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
