'use client'

import { useState } from 'react'

interface Email {
  tone: string
  subject: string
  body: string
}

const TONE_META: Record<string, { label: string; desc: string; border: string }> = {
  friendly: { label: 'Friendly',      desc: 'Assume it slipped their mind.',         border: 'border-l-4 border-gray-300' },
  firm:     { label: 'Firm',          desc: 'Direct. Asks for a specific date.',      border: 'border-l-4 border-gray-600' },
  final:    { label: 'Final Notice',  desc: 'Last message before action.',            border: 'border-l-4 border-gray-900' },
}

export function NudgeGenerator() {
  const [context, setContext] = useState('')
  const [emails, setEmails] = useState<Email[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function generate(ctx: string) {
    setLoading(true)
    setError(null)
    setEmails(null)
    try {
      const res = await fetch('/api/ai/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'NO_API_KEY' ? 'No API key set.' : 'Something went wrong.')
        return
      }
      setEmails(data.emails)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (context.trim()) generate(context)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (emails) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Pick the tone that fits.</p>
          <div className="flex gap-4">
            <button type="button" onClick={() => generate(context)} disabled={loading} className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50">
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button type="button" onClick={() => setEmails(null)} className="text-sm text-gray-500 hover:text-gray-900">
              ← Edit context
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {emails.map((email) => {
            const meta = TONE_META[email.tone] ?? { label: email.tone, desc: '', border: 'border-l-4 border-gray-200' }
            return (
              <div key={email.tone} className={`rounded-lg border border-gray-200 bg-white overflow-hidden ${meta.border}`}>
                <div className="px-5 pt-4 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
                </div>

                <div className="px-5 pb-4 pt-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-400 mb-0.5">Subject</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                    </div>
                    <button type="button" onClick={() => copy(email.subject, `${email.tone}-subject`)} className="shrink-0 text-xs text-gray-400 hover:text-gray-900">
                      {copied === `${email.tone}-subject` ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-400">Body</p>
                      <button type="button" onClick={() => copy(email.body, `${email.tone}-body`)} className="text-xs text-gray-400 hover:text-gray-900">
                        {copied === `${email.tone}-body` ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                  </div>

                  <button type="button" onClick={() => copy(`Subject: ${email.subject}\n\n${email.body}`, `${email.tone}-all`)} className="w-full rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
                    {copied === `${email.tone}-all` ? 'Copied!' : 'Copy subject + body'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="context" className="block text-sm font-medium text-gray-700">Invoice & client context</label>
        <p className="mt-0.5 text-sm text-gray-400">Include the client name, amount, invoice number, due date, and days overdue.</p>
        <textarea
          id="context" rows={6} value={context} onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. Client: Tunde Bakare, Apex Media. Invoice #004 for ₦250,000 (website redesign). Due May 1st, now 18 days overdue. Gone quiet this week."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!context.trim() || loading} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
        {loading ? 'Writing emails...' : 'Generate follow-ups'}
      </button>
    </form>
  )
}
