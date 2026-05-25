'use client'

import { useState, useEffect } from 'react'
import { PageContent } from '@/components/ui/PageContent'

interface Expense {
  id: string
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
  created_at: string
}

const CATEGORIES = [
  { value: 'software',             label: 'Software' },
  { value: 'hardware',             label: 'Hardware' },
  { value: 'marketing',            label: 'Marketing' },
  { value: 'travel',               label: 'Travel' },
  { value: 'office',               label: 'Office' },
  { value: 'meals',                label: 'Meals' },
  { value: 'professional_services',label: 'Professional services' },
  { value: 'taxes',                label: 'Taxes' },
  { value: 'other',                label: 'Other' },
]

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS']
const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }

function fmt(amount: number, currency: string) {
  return `${SYMBOLS[currency] ?? currency}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function catLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((data) => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !date) return
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, category, description, date }),
      })
      const data = await res.json()
      if (res.ok) {
        setExpenses((prev) => [data, ...prev])
        setAmount('')
        setDescription('')
        setDate(new Date().toISOString().split('T')[0])
        setCategory('other')
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  // Totals by currency
  const totals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + e.amount
    return acc
  }, {})

  return (
    <PageContent>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Expenses</h1>
            <p className="mt-0.5 text-sm text-gray-400">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} logged</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add expense'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-900">New expense</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label htmlFor="exp-description" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description</label>
                <input
                  id="exp-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Figma subscription"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label htmlFor="exp-category" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Category</label>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="exp-date" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                <input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="exp-currency" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Currency</label>
                <select
                  id="exp-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 bg-white"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-amount" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{SYMBOLS[currency] ?? currency}</span>
                  <input
                    id="exp-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={saving || !amount}
                  className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Totals summary */}
        {Object.keys(totals).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(totals).map(([cur, total]) => (
              <div key={cur} className="rounded-xl bg-white border border-gray-200 px-5 py-3 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total ({cur})</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{fmt(total, cur)}</p>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-400">No expenses logged yet.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm font-medium text-gray-900 hover:underline"
            >
              Add your first expense →
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-5 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 tabular-nums">
                      {new Date(exp.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{exp.description || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                        {catLabel(exp.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-gray-900">
                      {fmt(exp.amount, exp.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-50 transition-colors text-xs"
                        aria-label="Delete expense"
                      >
                        {deletingId === exp.id ? '…' : '×'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContent>
  )
}
