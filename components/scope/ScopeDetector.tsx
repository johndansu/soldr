'use client'

import { useState } from 'react'

interface ScopeResult {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification'
  explanation: string
  suggested_response: string
}

const VERDICT_META = {
  in_scope: {
    label: 'In Scope',
    desc: 'This is covered by what was agreed.',
    badge: 'bg-green-50 border-green-200 text-green-800',
  },
  out_of_scope: {
    label: 'Out of Scope',
    desc: 'This goes beyond the original agreement.',
    badge: 'bg-red-50 border-red-200 text-red-800',
  },
  needs_clarification: {
    label: 'Needs Clarification',
    desc: "It's ambiguous — ask before committing.",
    badge: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
}

export function ScopeDetector() {
  const [agreedScope, setAgreedScope] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [result, setResult] = useState<ScopeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreedScope.trim() || !clientMessage.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedScope, clientMessage }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'NO_API_KEY'
          ? 'No API key set. Go to Settings to add your key.'
          : 'Something went wrong. Please try again.')
        return
      }
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.suggested_response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setCopied(false)
  }

  if (result) {
    const meta = VERDICT_META[result.verdict]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${meta.badge}`}>
            {meta.label}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Check another
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">What this means</p>
          <p className="text-sm text-gray-700">{result.explanation}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Suggested reply</p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.suggested_response}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">What you submitted</p>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Agreed scope</p>
            <p className="text-xs text-gray-600 line-clamp-2">{agreedScope}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">Client message</p>
            <p className="text-xs text-gray-600 line-clamp-2">{clientMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="scope" className="block text-sm font-medium text-gray-700">
          What was originally agreed
        </label>
        <p className="mt-0.5 text-sm text-gray-500">
          Paste the relevant part of your proposal, contract, or brief summary.
        </p>
        <textarea
          id="scope"
          rows={5}
          value={agreedScope}
          onChange={(e) => setAgreedScope(e.target.value)}
          placeholder="e.g. 5-page website: Home, About, Services, Portfolio, Contact. Up to 2 rounds of revisions. Paystack integration. No e-commerce functionality. Delivered in 4 weeks."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Client's new request
        </label>
        <p className="mt-0.5 text-sm text-gray-500">
          Paste exactly what the client said — WhatsApp message, email, voice note transcript.
        </p>
        <textarea
          id="message"
          rows={4}
          value={clientMessage}
          onChange={(e) => setClientMessage(e.target.value)}
          placeholder="e.g. Hi, I was also thinking — can we add a blog section and a shop where people can buy my products? I think it would really complete the site."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!agreedScope.trim() || !clientMessage.trim() || loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Analysing...' : 'Check scope'}
      </button>
    </form>
  )
}
