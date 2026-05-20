'use client'

import { useState } from 'react'

interface Email {
  tone: string
  subject: string
  body: string
}

const TONE_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: 'Friendly', color: 'bg-green-50 border-green-200 text-green-800' },
  firm:     { label: 'Firm',     color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  final:    { label: 'Final Notice', color: 'bg-red-50 border-red-200 text-red-800' },
}

export function NudgeGenerator() {
  const [context, setContext] = useState('')
  const [emails, setEmails] = useState<Email[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!context.trim()) return
    setLoading(true)
    setError(null)
    setEmails(null)
    try {
      const res = await fetch('/api/ai/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
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

  function handleCopy(email: Email) {
    const text = `Subject: ${email.subject}\n\n${email.body}`
    navigator.clipboard.writeText(text)
    setCopied(email.tone)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleReset() {
    setContext('')
    setEmails(null)
    setError(null)
  }

  if (emails) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Pick the tone that fits the situation.</p>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Start over
          </button>
        </div>

        <div className="space-y-4">
          {emails.map((email) => {
            const meta = TONE_LABELS[email.tone] ?? { label: email.tone, color: 'bg-gray-50 border-gray-200 text-gray-800' }
            return (
              <div key={email.tone} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(email)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900"
                  >
                    {copied === email.tone ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Subject</p>
                  <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Body</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{email.body}</p>
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
          Include the client name, amount owed, due date, and how many days overdue.
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
