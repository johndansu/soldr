'use client'

import { useState } from 'react'

interface ScopeResult {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification'
  explanation: string
  suggested_response: string
}

const VERDICT_META = {
  in_scope:              { label: 'In Scope',           color: 'text-green-600' },
  out_of_scope:          { label: 'Out of Scope',        color: 'text-red-600' },
  needs_clarification:   { label: 'Needs Clarification', color: 'text-yellow-600' },
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
        setError(data.error === 'NO_API_KEY' ? 'No API key set.' : 'Something went wrong.')
        return
      }
      setResult(data)
    } catch {
      setError('Something went wrong.')
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

  if (result) {
    const meta = VERDICT_META[result.verdict]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={`text-base font-semibold ${meta.color}`}>{meta.label}</p>
          <button type="button" onClick={() => setResult(null)} className="text-sm text-gray-400 hover:text-gray-700">
            ← Check another
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">What this means</p>
          <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Suggested reply</p>
            <button type="button" onClick={handleCopy} className="text-xs font-medium text-gray-400 hover:text-gray-900">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.suggested_response}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="scope" className="block text-sm font-medium text-gray-700">What was originally agreed</label>
        <p className="mt-0.5 text-sm text-gray-400">Paste the relevant part of your proposal, contract, or brief summary.</p>
        <textarea id="scope" rows={5} value={agreedScope} onChange={(e) => setAgreedScope(e.target.value)}
          placeholder="e.g. 5-page website: Home, About, Services, Portfolio, Contact. Up to 2 rounds of revisions. Paystack integration. No e-commerce."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Client's new request</label>
        <p className="mt-0.5 text-sm text-gray-400">Paste exactly what the client said — WhatsApp message, email, voice note transcript.</p>
        <textarea id="message" rows={4} value={clientMessage} onChange={(e) => setClientMessage(e.target.value)}
          placeholder="e.g. Hi, can we also add a blog and a shop where people can buy my products?"
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!agreedScope.trim() || !clientMessage.trim() || loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
        {loading ? 'Analysing...' : 'Check scope'}
      </button>
    </form>
  )
}
