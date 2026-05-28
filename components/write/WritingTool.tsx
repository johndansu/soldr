'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface FieldConfig {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'textarea'
  required?: boolean
  hint?: string
}

export interface OutputSection {
  label: string
  content: string
}

interface Props {
  tool: string
  title: string
  description: string
  fields: FieldConfig[]
  endpoint: string
  parseOutput: (data: unknown) => OutputSection[]
  backHref?: string
}

export function WritingTool({ tool, title, description, fields, endpoint, parseOutput, backHref = '/dashboard/write' }: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [sections, setSections] = useState<OutputSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
    setSavedId(null)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSections([])
    setSavedId(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'NO_API_KEY' ? 'No API key set. Add your Anthropic key in Settings.' : 'Generation failed. Try again.')
        return
      }
      setSections(parseOutput(data))
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(content: string, key: string) {
    await navigator.clipboard.writeText(content)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSave() {
    if (!sections.length) return
    setSaving(true)
    try {
      const firstField = fields.find((f) => f.required) ?? fields[0]
      const titleValue = form[firstField?.key ?? ''] ?? title
      const output = JSON.stringify(sections)
      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, title: titleValue.slice(0, 120), output }),
      })
      const data = await res.json()
      if (res.ok) setSavedId(data.id)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={backHref} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Write</Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-0.5 text-sm text-gray-400">{description}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <form onSubmit={handleGenerate} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {f.label}{f.required && <span className="text-gray-400 ml-0.5">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  className={inputCls}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-gray-400">{f.hint}</p>}
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={loading}
              className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {loading && (
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>

      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">{s.label}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(s.content, s.label)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {copied === s.label ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{s.content}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !!savedId}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : savedId ? '✓ Saved' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setSections([]); setSavedId(null) }}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
