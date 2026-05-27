'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS']
function symOf(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtHours(h: number) { return `${h}h` }
function fmtAmt(n: number, c: string) {
  return `${symOf(c)}${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function today() { return new Date().toISOString().split('T')[0] }

interface Client { id: string; name: string }
interface Entry {
  id: string; date: string; hours: number; description: string | null
  rate: number; currency: string; invoiced: boolean; invoice_id: string | null
  client_id: string | null; clients: { name: string } | { name: string }[] | null
}
interface Form {
  clientId: string; date: string; hours: string; description: string; rate: string; currency: string
}

function clientName(e: Entry) {
  if (!e.clients) return 'No client'
  return Array.isArray(e.clients) ? e.clients[0]?.name : e.clients.name
}

export function TimeTracker({
  clients, initialEntries, defaultCurrency,
}: {
  clients: Client[]
  initialEntries: Entry[]
  defaultCurrency: string
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterClient, setFilterClient] = useState<string>('all')
  const [showInvoiced, setShowInvoiced] = useState(false)

  const [form, setForm] = useState<Form>({
    clientId: '', date: today(), hours: '', description: '', rate: '', currency: defaultCurrency,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [invoiceModal, setInvoiceModal] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [generating, setGenerating] = useState(false)

  function setField(k: keyof Form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setFormError(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.hours || parseFloat(form.hours) <= 0) { setFormError('Enter valid hours'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId || null,
          date: form.date,
          hours: parseFloat(form.hours),
          description: form.description,
          rate: parseFloat(form.rate) || 0,
          currency: form.currency,
        }),
      })
      if (!res.ok) { setFormError('Could not save. Try again.'); return }
      setForm((f) => ({ ...f, hours: '', description: '' }))
      router.refresh()
      // Optimistic: refetch
      const list = await fetch('/api/time').then((r) => r.json())
      setEntries(list)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
    await fetch(`/api/time/${id}`, { method: 'DELETE' })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleGenerateInvoice() {
    if (!dueDate) return
    setGenerating(true)
    try {
      const res = await fetch('/api/time/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: [...selected], dueDate }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Failed'); return }
      setSelected(new Set())
      setInvoiceModal(false)
      router.push(`/dashboard/invoices/${data.invoiceId}`)
    } finally {
      setGenerating(false)
    }
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!showInvoiced && e.invoiced) return false
      if (filterClient !== 'all' && e.client_id !== filterClient) return false
      return true
    })
  }, [entries, filterClient, showInvoiced])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of filtered) {
      const k = e.date
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return map
  }, [filtered])

  // Totals for selected
  const selectedEntries = entries.filter((e) => selected.has(e.id))
  const selectedHours = selectedEntries.reduce((s, e) => s + e.hours, 0)
  const selectedValue = selectedEntries.reduce((s, e) => s + e.hours * e.rate, 0)
  const selectedCurrency = selectedEntries[0]?.currency ?? defaultCurrency

  // Unbillable = entries with rate = 0 or no client
  const selectionHasNoBillable = selectedEntries.some((e) => !e.client_id || e.rate === 0)
  const selectionMultiClient = new Set(selectedEntries.map((e) => e.client_id)).size > 1
  const selectionMultiCurrency = new Set(selectedEntries.map((e) => e.currency)).size > 1

  const canInvoice = selected.size > 0 && !selectionHasNoBillable && !selectionMultiClient && !selectionMultiCurrency

  const totalHours    = entries.filter((e) => !e.invoiced).reduce((s, e) => s + e.hours, 0)
  const totalBillable = entries.filter((e) => !e.invoiced && e.rate > 0).reduce((s, e) => s + e.hours * e.rate, 0)

  const field = 'block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Time</h1>
          {totalHours > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {fmtHours(totalHours)} unbilled
              {totalBillable > 0 && ` · ${fmtAmt(totalBillable, defaultCurrency)} billable`}
            </p>
          )}
        </div>
      </div>

      {/* Log entry form */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 mb-4">Log time</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}
                className={field} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
              <input type="number" min="0.25" max="24" step="0.25" value={form.hours}
                onChange={(e) => setField('hours', e.target.value)}
                placeholder="2.5" className={field} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rate / hr</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  {symOf(form.currency)}
                </span>
                <input type="number" min="0" step="any" value={form.rate}
                  onChange={(e) => setField('rate', e.target.value)}
                  placeholder="0" className={`${field} pl-6`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setField('currency', e.target.value)}
                title="Currency" className={field}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{symOf(c)} {c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setField('description', e.target.value)}
                placeholder="What did you work on?" className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
              <select value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}
                title="Client" className={field}>
                <option value="">No client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Log entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="rounded-2xl border border-gray-900 bg-gray-900 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="text-sm text-white">
            <span className="font-semibold">{selected.size} entr{selected.size === 1 ? 'y' : 'ies'}</span>
            <span className="text-white/50 ml-2">
              {fmtHours(selectedHours)}
              {selectedValue > 0 && ` · ${fmtAmt(selectedValue, selectedCurrency)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors">
              Clear
            </button>
            {selectionMultiClient && <p className="text-xs text-amber-400">Multiple clients selected</p>}
            {selectionMultiCurrency && <p className="text-xs text-amber-400">Multiple currencies selected</p>}
            {selectionHasNoBillable && <p className="text-xs text-amber-400">Some entries have no rate / client</p>}
            {canInvoice && (
              <button onClick={() => setInvoiceModal(true)}
                className="rounded-xl bg-white px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors">
                Generate invoice →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            title="Filter by client"
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-300">
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={showInvoiced} onChange={(e) => setShowInvoiced(e.target.checked)}
              className="rounded border-gray-300" />
            Show invoiced
          </label>
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No time logged yet.</p>
          <p className="text-xs text-gray-400 mt-1">Use the form above to log your first entry.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {[...grouped.entries()].map(([date, dayEntries]) => {
            const dayHours = dayEntries.reduce((s, e) => s + e.hours, 0)
            const dayValue = dayEntries.reduce((s, e) => s + e.hours * e.rate, 0)
            const dayCur   = dayEntries[0]?.currency ?? defaultCurrency
            return (
              <div key={date}>
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">{fmtDate(date)}</p>
                  <p className="text-xs text-gray-400">
                    {fmtHours(dayHours)}
                    {dayValue > 0 && ` · ${fmtAmt(dayValue, dayCur)}`}
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {dayEntries.map((entry) => {
                    const isSelected = selected.has(entry.id)
                    const amount = entry.hours * entry.rate
                    return (
                      <div key={entry.id}
                        className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isSelected ? 'bg-gray-50' : ''} ${entry.invoiced ? 'opacity-50' : ''}`}>
                        {!entry.invoiced && (
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(entry.id)}
                            aria-label="Select entry"
                            className="rounded border-gray-300 shrink-0 cursor-pointer" />
                        )}
                        {entry.invoiced && (
                          <div className="w-4 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-900 truncate">
                              {entry.description ?? <span className="text-gray-400 italic">No description</span>}
                            </p>
                            {entry.invoiced && (
                              <Link href={`/dashboard/invoices/${entry.invoice_id}`}
                                className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-100 transition-colors">
                                invoiced
                              </Link>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {clientName(entry)}
                            {entry.rate > 0 && ` · ${symOf(entry.currency)}${entry.rate}/hr`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtHours(entry.hours)}</p>
                          {amount > 0 && (
                            <p className="text-xs text-gray-400 tabular-nums">{fmtAmt(amount, entry.currency)}</p>
                          )}
                        </div>
                        {!entry.invoiced && (
                          <button onClick={() => handleDelete(entry.id)} aria-label="Delete entry"
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                              <path d="M2 2l8 8M10 2L2 10" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Generate invoice modal */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Generate invoice</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selected.size} entr{selected.size === 1 ? 'y' : 'ies'} · {fmtHours(selectedHours)}
                {selectedValue > 0 && ` · ${fmtAmt(selectedValue, selectedCurrency)}`}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className={field} required />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={handleGenerateInvoice} disabled={!dueDate || generating}
                className="flex-1 rounded-xl bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {generating ? 'Creating…' : 'Create invoice'}
              </button>
              <button onClick={() => setInvoiceModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
