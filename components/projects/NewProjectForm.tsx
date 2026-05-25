'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS']

interface Client { id: string; name: string }

export function NewProjectForm({ clients, defaultCurrency }: { clients: Client[]; defaultCurrency: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, clientId, budget: budget || null, currency, startDate: startDate || null, endDate: endDate || null, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create project.'); return }
      router.push(`/dashboard/projects/${data.id}`)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brand identity for Acme Q3"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>

      {/* Client */}
      {clients.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Client <span className="text-gray-300">(optional)</span></label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">No client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Budget + Currency */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Budget <span className="text-gray-300">(optional)</span></label>
        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0.00"
            min="0"
            step="any"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Start date <span className="text-gray-300">(optional)</span></label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">End date <span className="text-gray-300">(optional)</span></label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes <span className="text-gray-300">(optional)</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any context about this project…"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create project'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
