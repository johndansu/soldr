'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Client { id: string; name: string }
interface LineItem { id: string; description: string; qty: string; rate: string }

interface Props {
  clients: Client[]
  defaultCurrency: string
  defaultTaxRate: number
}

const CURRENCIES = [
  { value: 'NGN', label: '₦ NGN' },
  { value: 'USD', label: '$ USD' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GHS', label: 'GH₵ GHS' },
]

const FREQUENCIES = [
  { value: 'weekly',    label: 'Weekly',    desc: 'Every 7 days' },
  { value: 'monthly',   label: 'Monthly',   desc: 'Same day each month' },
  { value: 'quarterly', label: 'Quarterly', desc: 'Every 3 months' },
]

const DUE_OPTIONS = [
  { value: 7,  label: 'Net 7' },
  { value: 14, label: 'Net 14' },
  { value: 30, label: 'Net 30' },
  { value: 60, label: 'Net 60' },
]

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function fmtNum(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const editCls = 'bg-transparent focus:bg-gray-50 focus:outline-none rounded px-1 -mx-1 transition-colors w-full'

export function RecurringTemplateForm({ clients, defaultCurrency, defaultTaxRate }: Props) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly')
  const [nextRunDate, setNextRunDate] = useState('')
  const [dueDaysAfter, setDueDaysAfter] = useState(7)
  const [currency, setCurrency] = useState(defaultCurrency || 'NGN')
  const [items, setItems] = useState<LineItem[]>([{ id: '1', description: '', qty: '1', rate: '' }])
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate || 0))
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sym = CURRENCY_SYMBOLS[currency] ?? currency

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0)
  const discountAmt = discountType === 'percentage'
    ? subtotal * (parseFloat(discount) || 0) / 100
    : (parseFloat(discount) || 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (parseFloat(taxRate) || 0) / 100
  const total = afterDiscount + taxAmt

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
    if (!clientId || !name || !nextRunDate) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invoice-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name: name.trim(),
          frequency,
          nextRunDate,
          dueDaysAfter,
          currency,
          lineItems: items.map(({ description, qty, rate }) => ({
            description: description.trim(),
            qty: parseFloat(qty) || 0,
            rate: parseFloat(rate) || 0,
          })),
          taxRate: parseFloat(taxRate) || 0,
          discount: parseFloat(discount) || 0,
          discountType,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) { setError('Could not save. Try again.'); return }
      router.push('/dashboard/invoices/recurring')
      router.refresh()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!clients.length) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Add a client before setting up a recurring invoice.</p>
        <a href="/dashboard/clients/new" className="mt-3 inline-block text-sm font-medium text-gray-900 underline">
          Add a client →
        </a>
      </div>
    )
  }

  const canSubmit = !!clientId && !!name.trim() && !!nextRunDate

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/invoices/recurring" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Recurring
        </Link>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button type="button" onClick={() => router.back()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit || loading}
            className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
            {loading ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>

      {/* Template card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Name + client */}
        <div className="px-8 pt-8 pb-6 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Template name</p>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Monthly retainer · Acme Corp"
              aria-label="Template name" required
              className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none border-b border-dashed border-gray-200 focus:border-gray-400 pb-1 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Client</p>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                aria-label="Client" required
                className="w-full text-sm text-gray-700 bg-transparent focus:outline-none border-b border-dashed border-gray-300 focus:border-gray-500 pb-0.5 transition-colors cursor-pointer">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Currency</p>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
                className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer">
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Frequency + schedule */}
        <div className="px-8 py-6 space-y-5">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Frequency</p>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <button key={f.value} type="button"
                  onClick={() => setFrequency(f.value as typeof frequency)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                    frequency === f.value
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className={`text-xs mt-0.5 ${frequency === f.value ? 'text-white/60' : 'text-gray-400'}`}>{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">First invoice date</p>
              <input type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)}
                aria-label="First invoice date" required
                className="text-sm text-gray-900 bg-transparent focus:outline-none border-b border-dashed border-gray-200 focus:border-gray-400 w-full pb-0.5 transition-colors" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment terms</p>
              <div className="flex gap-1.5 flex-wrap">
                {DUE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setDueDaysAfter(opt.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      dueDaysAfter === opt.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Line items */}
        <div className="px-8 py-6">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Line items</p>
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
                      <input type="text" value={item.description}
                        aria-label="Description" placeholder="Service or product…"
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className={`text-sm text-gray-800 placeholder:text-gray-300 ${editCls}`} />
                    </td>
                    <td className="py-3">
                      <input type="number" value={item.qty} min="0" step="any"
                        aria-label="Quantity" title="Quantity"
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className={`text-sm text-gray-600 tabular-nums text-right ${editCls}`} />
                    </td>
                    <td className="py-3">
                      <input type="number" value={item.rate} min="0" step="0.01"
                        aria-label="Rate" placeholder="0.00"
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                        className={`text-sm text-gray-600 tabular-nums text-right placeholder:text-gray-300 ${editCls}`} />
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-gray-900 tabular-nums">
                      {amount > 0 ? `${sym}${fmtNum(amount)}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button type="button" onClick={() => removeItem(item.id)}
                        disabled={items.length === 1} aria-label="Remove item"
                        className="opacity-0 group-hover:opacity-100 disabled:!opacity-0 transition-opacity text-gray-300 hover:text-red-400">
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

        {/* Totals */}
        <div className="px-8 pb-6">
          <div className="ml-auto w-64 space-y-2.5 pt-4 border-t border-gray-100">
            {subtotal > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{sym}{fmtNum(subtotal)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Discount</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button type="button" onClick={() => setDiscountType('percentage')}
                  className={`px-2 py-0.5 transition-colors ${discountType === 'percentage' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>%</button>
                <button type="button" onClick={() => setDiscountType('fixed')}
                  className={`px-2 py-0.5 border-l border-gray-200 transition-colors ${discountType === 'fixed' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>{sym}</button>
              </div>
              <input type="number" min="0" step="0.01" value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0" aria-label="Discount"
                className="w-16 text-right text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-200 focus:border-gray-400 focus:outline-none tabular-nums" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-1">Tax (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                aria-label="Tax rate" title="Tax rate %"
                className="w-16 text-right text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-200 focus:border-gray-400 focus:outline-none tabular-nums" />
            </div>
            <div className="flex justify-between text-[15px] font-bold text-gray-900 pt-3 border-t border-gray-200">
              <span>Per invoice</span>
              <span className="tabular-nums">{sym}{fmtNum(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="h-px bg-gray-100 mx-8" />
        <div className="px-8 py-6">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Monthly retainer. Payment due within stated terms."
            className="w-full text-sm text-gray-600 placeholder:text-gray-300 bg-transparent focus:outline-none resize-none leading-relaxed" />
        </div>

        {/* Footer */}
        <div className="px-8 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Invoices will be generated automatically on each scheduled date. You can also trigger manually at any time.
          </p>
        </div>
      </div>
    </form>
  )
}
