'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { IncomeReportData, CurrencyReport } from '@/app/api/reports/income/route'
import type { ExpenseReportData } from '@/app/api/reports/expenses/route'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1) }
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}
function endOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0)
}

const today = new Date()
const PRESETS = [
  { label: 'This month',   from: toISO(startOfMonth(today)),                           to: toISO(today) },
  { label: 'Last month',   from: toISO(startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1))), to: toISO(endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1))) },
  { label: 'This quarter', from: toISO(startOfQuarter(today)),                         to: toISO(today) },
  { label: 'Last quarter', from: toISO(startOfQuarter(new Date(today.getFullYear(), today.getMonth() - 3, 1))), to: toISO(endOfQuarter(new Date(today.getFullYear(), today.getMonth() - 3, 1))) },
  { label: 'This year',    from: toISO(startOfYear(today)),                            to: toISO(today) },
  { label: 'Last year',    from: `${today.getFullYear() - 1}-01-01`,                   to: `${today.getFullYear() - 1}-12-31` },
]

// ─── Formatting ───────────────────────────────────────────────────────────────

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵', CAD: 'CA$', AUD: 'A$' }
function fmt(amount: number, currency: string) {
  const sym = SYMBOLS[currency] ?? currency + ' '
  return `${sym}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  paid:    'bg-green-50 text-green-700',
  unpaid:  'bg-gray-100 text-gray-500',
  overdue: 'bg-red-50 text-red-600',
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 space-y-1.5 ${accent ? 'border-red-100 bg-red-50/60' : 'border-gray-200 bg-white'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IncomeReport() {
  const [preset, setPreset] = useState(PRESETS[0].label)
  const [from, setFrom] = useState(PRESETS[0].from)
  const [to, setTo] = useState(PRESETS[0].to)
  const [data, setData] = useState<IncomeReportData | null>(null)
  const [expenseData, setExpenseData] = useState<ExpenseReportData | null>(null)
  const [taxAsidePct, setTaxAsidePct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null)

  const fetchReport = useCallback(async (f: string, t: string) => {
    setLoading(true)
    setError('')
    try {
      const [incRes, expRes, settingsRes] = await Promise.all([
        fetch(`/api/reports/income?from=${f}&to=${t}`),
        fetch(`/api/reports/expenses?from=${f}&to=${t}`),
        fetch('/api/settings/business'),
      ])
      if (!incRes.ok) { setError('Failed to load report'); return }
      const json: IncomeReportData = await incRes.json()
      setData(json)
      if (json.currencies.length > 0) {
        setActiveCurrency((prev) => json.currencies.includes(prev ?? '') ? prev : json.currencies[0])
      }
      if (expRes.ok) setExpenseData(await expRes.json())
      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setTaxAsidePct(Number(s.tax_aside_pct) || 0)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReport(from, to) }, [from, to, fetchReport])

  function applyPreset(p: typeof PRESETS[0]) {
    setPreset(p.label)
    setFrom(p.from)
    setTo(p.to)
  }

  function applyCustom(f: string, t: string) {
    setPreset('')
    setFrom(f)
    setTo(t)
    fetchReport(f, t)
  }

  const report: CurrencyReport | null = activeCurrency ? data?.byCurrency[activeCurrency] ?? null : null

  return (
    <div className="space-y-6 print:space-y-4">

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p.label
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <input
            type="date"
            value={from}
            title="From date"
            onChange={(e) => applyCustom(e.target.value, to)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <span className="text-gray-300 text-xs">→</span>
          <input
            type="date"
            value={to}
            title="To date"
            onChange={(e) => applyCustom(from, e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h2 className="text-lg font-bold text-gray-900">Income Report</h2>
        <p className="text-sm text-gray-500">{fmtDate(from)} — {fmtDate(to)}</p>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400 animate-pulse">Loading report…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && data && data.currencies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No invoices in this date range.</p>
          <Link href="/dashboard/invoices/new" className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline">
            Create your first invoice →
          </Link>
        </div>
      )}

      {!loading && data && data.currencies.length > 0 && (
        <>
          {/* Currency tabs */}
          {data.currencies.length > 1 && (
            <div className="flex items-center gap-2 print:hidden">
              {data.currencies.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setActiveCurrency(cur)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeCurrency === cur
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          )}

          {report && (
            <div className="space-y-6">

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  label="Total billed"
                  value={fmt(report.summary.billed, report.currency)}
                  sub={`${report.summary.invoiceCount} invoice${report.summary.invoiceCount !== 1 ? 's' : ''}`}
                />
                <KpiCard
                  label="Collected"
                  value={fmt(report.summary.collected, report.currency)}
                  sub={report.summary.billed > 0 ? `${Math.round(report.summary.collected / report.summary.billed * 100)}% of billed` : undefined}
                />
                <KpiCard
                  label="Outstanding"
                  value={fmt(report.summary.outstanding, report.currency)}
                  sub="Unpaid and not overdue"
                />
                <KpiCard
                  label="Overdue"
                  value={fmt(report.summary.overdue, report.currency)}
                  sub="Past due date"
                  accent={report.summary.overdue > 0}
                />
              </div>

              {/* P&L summary */}
              {expenseData && (expenseData.byCurrency[report.currency] ?? 0) > 0 && (() => {
                const totalExpenses = expenseData.byCurrency[report.currency] ?? 0
                const income = report.summary.collected
                const profit = income - totalExpenses
                const margin = income > 0 ? Math.round(profit / income * 100) : 0
                const catRows = expenseData.byCategory.filter((c) => c.currency === report.currency)
                return (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Profit & Loss</p>
                    </div>
                    <div className="px-5 py-5 space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Income collected</span>
                          <span className="font-semibold text-gray-900">{fmt(income, report.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Expenses</span>
                          <span className="font-semibold text-red-600">− {fmt(totalExpenses, report.currency)}</span>
                        </div>
                        <div className="h-px bg-gray-100" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900">Net profit</span>
                          <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profit >= 0 ? '' : '− '}{fmt(Math.abs(profit), report.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Profit margin</span>
                          <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{margin}%</span>
                        </div>
                        {taxAsidePct > 0 && income > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                            <span>Tax set-aside ({taxAsidePct}% of collected)</span>
                            <span className="font-semibold">{fmt(income * taxAsidePct / 100, report.currency)}</span>
                          </div>
                        )}
                      </div>

                      {catRows.length > 0 && (
                        <>
                          <div className="h-px bg-gray-100" />
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Expenses by category</p>
                            {catRows.map((c) => (
                              <div key={c.category} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 capitalize">{c.category.replace(/_/g, ' ')}</span>
                                <span className="tabular-nums text-gray-900">{fmt(c.total, c.currency)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* By client */}
              {report.byClient.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">By client</p>
                    <p className="text-xs text-gray-400">{report.currency}</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoices</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Billed</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Collected</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byClient.map((row) => (
                        <tr key={row.clientId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{row.clientName}</td>
                          <td className="px-5 py-3 text-right text-gray-500">{row.invoiceCount}</td>
                          <td className="px-5 py-3 text-right text-gray-900 font-medium">{fmt(row.billed, report.currency)}</td>
                          <td className="px-5 py-3 text-right text-green-700">{fmt(row.collected, report.currency)}</td>
                          <td className={`px-5 py-3 text-right font-medium ${row.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {fmt(row.outstanding, report.currency)}
                            {row.overdue > 0 && (
                              <span className="ml-1.5 text-[10px] font-semibold text-red-500">({fmt(row.overdue, report.currency)} overdue)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {report.byClient.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">Total</td>
                          <td className="px-5 py-3 text-right text-xs text-gray-500">{report.summary.invoiceCount}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{fmt(report.summary.billed, report.currency)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-green-700">{fmt(report.summary.collected, report.currency)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-gray-500">{fmt(report.summary.outstanding, report.currency)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* By month */}
              {report.byMonth.length > 1 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">By month</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Month</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Billed</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Collected</th>
                        <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-32">Collection rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byMonth.map((row) => {
                        const rate = row.billed > 0 ? Math.round(row.collected / row.billed * 100) : 0
                        return (
                          <tr key={row.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900">{row.label}</td>
                            <td className="px-5 py-3 text-right text-gray-900">{fmt(row.billed, report.currency)}</td>
                            <td className="px-5 py-3 text-right text-green-700">{fmt(row.collected, report.currency)}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${rate === 100 ? 'bg-green-500' : rate > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-8 text-right">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invoice list */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Invoices</p>
                  <p className="text-xs text-gray-400">{report.invoices.length} total</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                      <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.invoices.map((inv) => {
                      const badgeCls = STATUS_BADGE[inv.status] ?? STATUS_BADGE.unpaid
                      return (
                        <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 group transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-gray-900 hover:underline print:no-underline">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{inv.clientName}</td>
                          <td className="px-5 py-3 text-right font-medium text-gray-900">
                            {fmt(inv.amount, inv.currency)}
                            {inv.partiallyPaid > 0 && inv.status !== 'paid' && (
                              <span className="ml-1.5 text-[10px] text-green-600">({fmt(inv.partiallyPaid, inv.currency)} paid)</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${badgeCls}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{fmtDate(inv.dueDate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
