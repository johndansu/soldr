'use client'

import { useState } from 'react'

interface BusinessProfile {
  businessName: string
  businessEmail: string
  businessAddress: string
  businessPhone: string
  bankDetails: string
  defaultTaxRate: string
  defaultCurrency: string
}

interface Props {
  initial: {
    business_name: string | null
    business_email: string | null
    business_address: string | null
    business_phone: string | null
    bank_details: string | null
    default_tax_rate: number | null
    default_currency: string | null
  }
}

export function BusinessProfileForm({ initial }: Props) {
  const [form, setForm] = useState<BusinessProfile>({
    businessName:    initial.business_name    ?? '',
    businessEmail:   initial.business_email   ?? '',
    businessAddress: initial.business_address ?? '',
    businessPhone:   initial.business_phone   ?? '',
    bankDetails:     initial.bank_details     ?? '',
    defaultTaxRate:  String(initial.default_tax_rate ?? 0),
    defaultCurrency: initial.default_currency ?? 'NGN',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof BusinessProfile, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, defaultTaxRate: parseFloat(form.defaultTaxRate) || 0 }),
      })
      if (!res.ok) { setError('Could not save. Try again.'); return }
      setSaved(true)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Business name</label>
          <input type="text" value={form.businessName} onChange={(e) => set('businessName', e.target.value)}
            placeholder="Tunde Studio" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Business email</label>
          <input type="email" value={form.businessEmail} onChange={(e) => set('businessEmail', e.target.value)}
            placeholder="hello@tundestudio.com" className={field} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
          <input type="text" value={form.businessPhone} onChange={(e) => set('businessPhone', e.target.value)}
            placeholder="+234 801 234 5678" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
          <input type="text" value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)}
            placeholder="Lagos, Nigeria" className={field} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Bank / payment details</label>
        <textarea rows={3} value={form.bankDetails} onChange={(e) => set('bankDetails', e.target.value)}
          placeholder="Bank: GTBank&#10;Account: 0123456789&#10;Name: Tunde Adeyemi"
          className={`${field} resize-none`} />
        <p className="mt-1 text-xs text-gray-400">Printed on every invoice under Notes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Default tax rate (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={form.defaultTaxRate}
            onChange={(e) => set('defaultTaxRate', e.target.value)}
            placeholder="7.5" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Default currency</label>
          <select value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className={field}>
            <option value="NGN">₦ NGN</option>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
            <option value="GHS">GH₵ GHS</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </form>
  )
}
