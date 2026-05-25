'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface BusinessProfile {
  businessName: string
  businessEmail: string
  businessAddress: string
  businessPhone: string
  bankDetails: string
  defaultTaxRate: string
  defaultCurrency: string
  invoicePrefix: string
  emailSignature: string
  taxAsidePct: string
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
    invoice_prefix: string | null
    logo_url: string | null
    email_signature: string | null
    tax_aside_pct: number | null
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
    invoicePrefix:   initial.invoice_prefix   ?? 'INV',
    emailSignature:  initial.email_signature  ?? '',
    taxAsidePct:     String(initial.tax_aside_pct ?? 0),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_url)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
        body: JSON.stringify({
          ...form,
          defaultTaxRate: parseFloat(form.defaultTaxRate) || 0,
          taxAsidePct:    parseFloat(form.taxAsidePct)    || 0,
          emailSignature: form.emailSignature.trim() || null,
        }),
      })
      if (!res.ok) { setError('Could not save. Try again.'); return }
      setSaved(true)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setLogoUrl(data.url)
      else setError(data.error ?? 'Upload failed')
    } finally {
      setUploadingLogo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleLogoRemove() {
    setRemovingLogo(true)
    try {
      await fetch('/api/settings/logo', { method: 'DELETE' })
      setLogoUrl(null)
    } finally {
      setRemovingLogo(false)
    }
  }

  const field = 'block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Logo */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Business logo</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={64} height={64} className="object-contain w-full h-full" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <rect x="1" y="3" width="14" height="10" rx="1.5" />
                <circle cx="5.5" cy="6.5" r="1" />
                <path d="M1 11l3.5-3.5 2.5 2.5 2-2 4 4" />
              </svg>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  disabled={removingLogo}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                >
                  {removingLogo ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP · max 2MB · appears on invoices and client pages</p>
          </div>
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden" aria-label="Upload business logo" onChange={handleLogoUpload} />
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Basic info */}
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

      <div className="h-px bg-gray-100" />

      {/* Invoice settings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Default tax rate (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={form.defaultTaxRate}
            onChange={(e) => set('defaultTaxRate', e.target.value)}
            placeholder="7.5" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Default currency</label>
          <select value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} title="Default currency" className={field}>
            <option value="NGN">₦ NGN</option>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
            <option value="GHS">GH₵ GHS</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Invoice prefix</label>
          <div className="relative">
            <input type="text" value={form.invoicePrefix}
              onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10))}
              placeholder="INV" className={field} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {form.invoicePrefix || 'INV'}-001
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Tax aside */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Tax set-aside (%)</label>
        <div className="flex items-center gap-3">
          <div className="relative w-40">
            <input type="number" min="0" max="100" step="0.5" value={form.taxAsidePct}
              onChange={(e) => set('taxAsidePct', e.target.value)}
              placeholder="0" className={field} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
          </div>
          <p className="text-xs text-gray-400">
            Shown in the income report as tax liability — e.g. set 30% to track how much to set aside from collected income.
          </p>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Email signature */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Email signature</label>
        <textarea rows={4} value={form.emailSignature} onChange={(e) => set('emailSignature', e.target.value)}
          placeholder={'Best,\nTunde Adeyemi\nTunde Studio\n+234 801 234 5678'}
          className={`${field} resize-none font-mono text-xs`} />
        <p className="mt-1 text-xs text-gray-400">Appended to outbound nudge emails.</p>
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
