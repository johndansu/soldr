'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Client { id: string; name: string; email: string | null }
interface LineItem { id: string; description: string; qty: string; rate: string }

interface Props {
  clients: Client[]
  defaultCurrency: string
  defaultTaxRate: number
  nextInvoiceNumber: string
  business: {
    name: string | null
    email: string | null
    address: string | null
    phone: string | null
  }
  prefill?: { clientId: string; description: string }
  proposalId?: string
  projectId?: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function symOf(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtNum(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CURRENCIES = [
  { value: 'NGN', label: '₦ NGN' },
  { value: 'USD', label: '$ USD' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GHS', label: 'GH₵ GHS' },
]

const DUE_DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
]

const editCls = 'bg-transparent focus:bg-gray-50 focus:outline-none rounded px-1 -mx-1 transition-colors w-full'
const editUnderlineCls = 'bg-transparent focus:outline-none border-b border-dashed border-gray-200 focus:border-gray-400 w-full transition-colors'

export function NewInvoiceForm({ clients, defaultCurrency, defaultTaxRate, nextInvoiceNumber, business, prefill, proposalId, projectId }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState(prefill?.clientId ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber)
  const [dueDate, setDueDate] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency || 'NGN')
  const [invoiceDescription, setInvoiceDescription] = useState(prefill?.description ?? '')
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: '', qty: '1', rate: '' },
  ])
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discount, setDiscount] = useState('')
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate || 0))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sym = symOf(currency)
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0)
  const discountAmt = discountType === 'percentage'
    ? subtotal * (parseFloat(discount) || 0) / 100
    : (parseFloat(discount) || 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (parseFloat(taxRate) || 0) / 100
  const total = afterDiscount + taxAmt

  function setDueDateRelative(days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDueDate(d.toISOString().split('T')[0])
  }

  function addItem() {
    setItems((p) => [...p, { id: String(Date.now()), description: '', qty: '1', rate: '' }])
  }
  function removeItem(id: string) {
    if (items.length === 1) return
    setItems((p) => p.filter((i) => i.id !== id))
  }
  function updateItem(id: string, field: 'description' | 'qty' | 'rate', value: string) {
    setItems((p) => p.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !dueDate) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          invoiceNumber: invoiceNumber.trim() || null,
          dueDate,
          currency,
          description: invoiceDescription.trim() || null,
          lineItems: items.map(({ description, qty, rate }) => ({
            description: description.trim(),
            qty: parseFloat(qty) || 0,
            rate: parseFloat(rate) || 0,
          })),
          discount: parseFloat(discount) || 0,
          discountType,
          taxRate: parseFloat(taxRate) || 0,
          notes: notes.trim() || null,
          proposalId: proposalId ?? null,
          projectId: projectId ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError('Could not save. Try again.'); return }
      router.push(`/dashboard/invoices/${data.id}`)
      router.refresh()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!clients.length) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Add a client before creating an invoice.</p>
        <a href="/dashboard/clients/new" className="mt-3 inline-block text-sm font-medium text-gray-900 underline">
          Add a client →
        </a>
      </div>
    )
  }

  const selectedClient = clients.find((c) => c.id === clientId)
  const missingClient = !clientId
  const missingDue = !dueDate

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/invoices" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Invoices
        </Link>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button type="button" onClick={() => router.back()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!clientId || !dueDate || loading}
            className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
            {loading ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </div>

      {/* From proposal banner */}
      {prefill && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 shrink-0">
            <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" />
            <path d="M9 1v5h5M5 9h6M5 12h4" />
          </svg>
          <p className="text-xs text-indigo-700">
            Pre-filled from proposal{prefill.description ? ` · ${prefill.description}` : ''}. Edit anything before creating.
          </p>
        </div>
      )}

      {/* Validation hints */}
      {(missingClient || missingDue) && (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0">
            <circle cx="8" cy="8" r="6.5" /><path d="M8 5v3.5M8 11h.01" />
          </svg>
          <p className="text-xs text-amber-700">
            {[missingClient && 'select a client', missingDue && 'set a due date']
              .filter(Boolean).join(' and ')
              .replace(/^./, (s) => s.toUpperCase())} to send this invoice.
          </p>
        </div>
      )}

      {/* Invoice canvas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header: company + invoice # + amount card */}
        <div className="px-8 pt-8 pb-7">
          <div className="flex items-start justify-between gap-8">

            {/* Company info (read-only from settings) */}
            <div className="space-y-0.5 min-w-0">
              {business.name ? (
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {business.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-[15px]">{business.name}</span>
                </div>
              ) : (
                <Link href="/dashboard/settings" className="text-xs text-indigo-500 hover:underline mb-3 block">
                  + Add business name in Settings
                </Link>
              )}
              {business.email   && <p className="text-sm text-gray-400">{business.email}</p>}
              {business.phone   && <p className="text-sm text-gray-400">{business.phone}</p>}
              {business.address && <p className="text-sm text-gray-400">{business.address}</p>}
            </div>

            {/* Invoice # + amount card */}
            <div className="shrink-0 text-right space-y-2.5">
              <div className="flex items-center justify-end gap-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</p>
                <span className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">Draft</span>
              </div>
              <input
                type="text" value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                aria-label="Invoice number"
                className="text-lg font-bold text-gray-900 bg-transparent focus:bg-gray-50 focus:outline-none rounded px-1 -mx-1 text-right w-36 transition-colors block ml-auto"
              />
              {/* Live amount card */}
              <div className="bg-gray-900 rounded-2xl px-6 py-4 text-white text-right min-w-[200px]">
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">Amount due</p>
                <p className="text-3xl font-bold tabular-nums leading-none transition-all duration-200">
                  {sym}{fmtNum(total)}
                </p>
                {dueDate ? (
                  <p className="text-xs opacity-60 mt-2">
                    Due {new Date(dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-xs opacity-30 mt-2">No due date yet</p>
                )}
              </div>
              {/* Currency selector */}
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-xs text-gray-400 bg-transparent focus:outline-none cursor-pointer hover:text-gray-700 transition-colors text-right"
              >
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Bill to + dates */}
        <div className="px-8 py-6 grid grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Billed to</p>
            {clientId && selectedClient ? (
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedClient.name}</p>
                {selectedClient.email && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedClient.email}</p>
                )}
                <button type="button" onClick={() => setClientId('')}
                  className="text-[11px] text-gray-400 hover:text-gray-600 mt-1 transition-colors">
                  Change
                </button>
              </div>
            ) : (
              <select
                aria-label="Client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="text-sm font-medium text-gray-500 bg-transparent focus:outline-none border-b border-dashed border-gray-300 focus:border-gray-500 w-full pb-0.5 transition-colors cursor-pointer"
              >
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Invoice date</p>
            <p className="text-sm text-gray-700">{today}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Due date</p>
            <input
              type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
              className={`text-sm text-gray-900 ${editUnderlineCls}`}
            />
            <div className="flex items-center gap-1 mt-2">
              {DUE_DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDueDateRelative(p.days)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors font-medium ${
                    (() => {
                      if (!dueDate) return 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                      const d = new Date(); d.setDate(d.getDate() + p.days)
                      const selected = d.toISOString().split('T')[0] === dueDate
                      return selected
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    })()
                  }`}
                >
                  +{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Optional invoice description */}
        <div className="px-8 pt-6 pb-2">
          <input
            type="text"
            value={invoiceDescription}
            onChange={(e) => setInvoiceDescription(e.target.value)}
            placeholder="Project title or description (optional)…"
            aria-label="Invoice description"
            className="w-full text-sm font-medium text-gray-700 placeholder:text-gray-300 bg-transparent focus:outline-none"
          />
        </div>

        {/* Line items */}
        <div className="px-8 pt-4 pb-6">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pb-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Description</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14">Qty</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-32">Rate</th>
                <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-28">Amount</th>
                <th className="w-8" aria-label="Remove" title="Remove" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)
                return (
                  <tr key={item.id} className="group border-t border-gray-50 first:border-0">
                    <td className="py-3">
                      <input
                        type="text" value={item.description}
                        aria-label="Item description"
                        placeholder="Service or product…"
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className={`text-sm text-gray-800 placeholder:text-gray-300 ${editCls}`}
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number" value={item.qty} min="0" step="any"
                        aria-label="Quantity" title="Quantity"
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className={`text-sm text-gray-600 tabular-nums text-right ${editCls}`}
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number" value={item.rate} min="0" step="0.01"
                        aria-label="Rate" placeholder="0.00"
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                        className={`text-sm text-gray-600 tabular-nums text-right placeholder:text-gray-300 ${editCls}`}
                      />
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {amount > 0 ? `${sym}${fmtNum(amount)}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        aria-label="Remove item"
                        className="opacity-0 group-hover:opacity-100 disabled:!opacity-0 transition-opacity text-gray-300 hover:text-red-400 p-0.5 rounded"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button type="button" onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors group/add">
            <span className="w-5 h-5 rounded flex items-center justify-center border border-dashed border-gray-300 group-hover/add:border-gray-400 transition-colors text-sm leading-none">+</span>
            Add line item
          </button>
        </div>

        {/* Totals + discount + tax */}
        <div className="px-8 pb-6">
          <div className="ml-auto w-72 space-y-2.5 pt-4 border-t border-gray-100">

            {subtotal > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{sym}{fmtNum(subtotal)}</span>
              </div>
            )}

            {/* Discount row */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Discount</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button type="button" onClick={() => setDiscountType('percentage')}
                  className={`px-2 py-0.5 transition-colors ${discountType === 'percentage' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  %
                </button>
                <button type="button" onClick={() => setDiscountType('fixed')}
                  className={`px-2 py-0.5 border-l border-gray-200 transition-colors ${discountType === 'fixed' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {sym}
                </button>
              </div>
              <input type="number" min="0" step="0.01" value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0" aria-label="Discount amount"
                className="w-20 text-right text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-200 focus:border-gray-400 focus:outline-none tabular-nums" />
            </div>

            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>−{discountType === 'percentage' && discount ? `${discount}% ` : ''}discount</span>
                <span className="tabular-nums">−{sym}{fmtNum(discountAmt)}</span>
              </div>
            )}

            {/* Tax row */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Tax (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                aria-label="Tax rate percentage" title="Tax rate %"
                className="w-20 text-right text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-200 focus:border-gray-400 focus:outline-none tabular-nums" />
            </div>

            {taxAmt > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>+{taxRate}% tax</span>
                <span className="tabular-nums">+{sym}{fmtNum(taxAmt)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between text-[15px] font-bold text-gray-900 pt-3 border-t border-gray-200">
              <span>Total</span>
              <span className="tabular-nums">{sym}{fmtNum(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="h-px bg-gray-100 mx-8" />
        <div className="px-8 py-6">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes / payment terms</p>
          <textarea
            rows={3} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment due within 7 days. Bank transfer preferred."
            className="w-full text-sm text-gray-600 placeholder:text-gray-300 bg-transparent focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Card footer hint */}
        <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            Payment details from your{' '}
            <Link href="/dashboard/settings" className="underline hover:text-gray-600">business profile</Link>
            {' '}will appear on the invoice.
          </p>
          {!missingClient && !missingDue && (
            <span className="text-[10px] font-medium text-green-600 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5" />
              </svg>
              Ready to send
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
