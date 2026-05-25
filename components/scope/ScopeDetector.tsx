'use client'

import { useState, useRef, useEffect } from 'react'
import { ThinkingState } from '@/components/ui/ThinkingState'

const THINKING_STEPS = [
  'Reading the agreed scope...',
  'Analysing the new request...',
  'Comparing against what was agreed...',
  'Assessing the overlap...',
  'Preparing your verdict...',
  'Writing the suggested reply...',
]

interface ScopeResult {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification'
  explanation: string
  suggested_response: string
}

const VERDICT_META = {
  in_scope:            { label: 'In Scope',           color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  out_of_scope:        { label: 'Out of Scope',        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
  needs_clarification: { label: 'Needs Clarification', color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
}

function AiAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center shrink-0">
      <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
        <path d="M9.5 2.5 C4 2.5,4 7,7 7 C10 7,10 11.5,4.5 11.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-0.5">
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="rounded-2xl bg-gray-900 text-white px-5 py-3.5 max-w-xl text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}

export function ScopeDetector({ initialAgreedScope = '' }: { initialAgreedScope?: string }) {
  const [agreedScope, setAgreedScope] = useState(initialAgreedScope)
  const [clientMessage, setClientMessage] = useState('')
  const [submittedScope, setSubmittedScope] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [result, setResult] = useState<ScopeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, result])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreedScope.trim() || !clientMessage.trim()) return
    setSubmittedScope(agreedScope)
    setSubmittedMessage(clientMessage)
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
      if (!res.ok) { setError(data.error === 'NO_API_KEY' ? 'No API key set.' : 'Something went wrong.'); return }
      setResult(data)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreedScope: submittedScope,
          clientMessage: submittedMessage,
          verdict: result.verdict,
          explanation: result.explanation,
          suggestedResponse: result.suggested_response,
        }),
      })
      const data = await res.json()
      if (res.ok) setSavedId(data.id)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setAgreedScope('')
    setClientMessage('')
    setSubmittedScope('')
    setSubmittedMessage('')
    setResult(null)
    setError(null)
    setSavedId(null)
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.suggested_response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-start gap-3">
            <AiAvatar />
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4 max-w-lg">
              <p className="text-sm text-gray-700 leading-relaxed">Paste what was originally agreed and what the client just asked — I'll give you a verdict and a ready-to-send reply.</p>
            </div>
          </div>

          {submittedScope && (
            <>
              <UserBubble text={`Agreed scope:\n${submittedScope}\n\nClient's request:\n${submittedMessage}`} />

              {loading && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-2">
                    <ThinkingState steps={THINKING_STEPS} />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                </div>
              )}

              {result && (() => {
                const meta = VERDICT_META[result.verdict]
                return (
                  <div className="flex items-start gap-3">
                    <AiAvatar />
                    <div className="flex-1 space-y-3">
                      <div className={`rounded-2xl border ${meta.border} ${meta.bg} px-6 py-4`}>
                        <p className={`text-base font-semibold tracking-tight ${meta.color}`}>{meta.label}</p>
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Suggested reply</p>
                          <button type="button" onClick={handleCopy}
                            className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                            {copied ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="px-6 py-5">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.suggested_response}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {result ? (
        <div className="shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            {savedId ? (
              <span className="text-sm font-medium text-green-600">✓ Saved</span>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            <button type="button" onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
              ← Check another
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">What was originally agreed</label>
                  <textarea
                    rows={3}
                    value={agreedScope}
                    onChange={(e) => setAgreedScope(e.target.value)}
                    placeholder="5-page website: Home, About, Services, Portfolio, Contact. 2 rounds of revisions. No e-commerce."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{"Client's new request"}</label>
                  <textarea
                    rows={3}
                    value={clientMessage}
                    onChange={(e) => setClientMessage(e.target.value)}
                    placeholder="Hi, can we also add a blog and a shop where people can buy my products?"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500 px-1">{error}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={!agreedScope.trim() || !clientMessage.trim() || loading}
                  className="flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Check scope
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
