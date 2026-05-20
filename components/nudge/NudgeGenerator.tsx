'use client'

import { useState } from 'react'

interface Email {
  tone: string
  subject: string
  body: string
}

const TONE_META: Record<string, { label: string; desc: string; badge: string; bar: string }> = {
  friendly: {
    label: 'Friendly',
    desc: 'Assume it slipped their mind. No pressure.',
    badge: 'bg-green-50 border-green-200 text-green-800',
    bar: 'bg-green-500',
  },
  firm: {
    label: 'Firm',
    desc: 'Direct. Asks for a specific payment date.',
    badge: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    bar: 'bg-yellow-500',
  },
  final: {
    label: 'Final Notice',
    desc: 'Last message before action is taken.',
    badge: 'bg-red-50 border-red-200 text-red-800',
    bar: 'bg-red-500',
  },
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
        setError(data.error === 'NO_API_KEY'
          ? 'No API key set. Go to Settings to add your key.'
          : 'Something went wrong. Please try again.')
        return
      }
      setEmails(data.emails)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!context.trim()) return
    generate(context)
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
          <p className="text-sm text-gray-500">Pick the tone that fits. Copy subject and body separately.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => generate(context)}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              type="button"
              onClick={() => { setEmails(null); setError(null) }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Edit context
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {emails.map((email) => {
            const meta = TONE_META[email.tone] ?? {
              label: email.tone, desc: '', badge: 'bg-gray-50 border-gray-200 text-gray-800', bar: 'bg-gray-400',
            }
            return (
              <div key={email.tone} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className={`h-1 w-full ${meta.bar}`} />
                <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">{meta.desc}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 space-y-3">
                  <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Subject</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(email.subject, `${email.tone}-subject`)}
                      className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900"
                    >
                      {copied === `${email.tone}-subject` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Body</p>
                      <button
                        type="button"
                        onClick={() => copy(email.body, `${email.tone}-body`)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900"
                      >
                        {copied === `${email.tone}-body` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copy(`Subject: ${email.subject}\n\n${email.body}`, `${email.tone}-all`)}
                    className="w-full rounded-md border border-gray-300 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
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
        <label htmlFor="context" className="block text-sm font-medium text-gray-700">
          Invoice & client context
        </label>
        <p className="mt-0.5 text-sm text-gray-500">
          Include the client name, amount owed, invoice number, due date, and days overdue. The more detail, the sharper the emails.
        </p>
        <textarea
          id="context"
          rows={6}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. Client: Tunde Bakare, Apex Media. Invoice #004 for ₦250,000 (website redesign). Due date was May 1st, now 18 days overdue. He's been responsive before but gone quiet this week. We had a good working relationship."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!context.trim() || loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Writing emails...' : 'Generate follow-ups'}
      </button>
    </form>
  )
}
