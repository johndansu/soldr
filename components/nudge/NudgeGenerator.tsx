'use client'

import { useState, useRef, useEffect } from 'react'
import { ThinkingState } from '@/components/ui/ThinkingState'

const THINKING_STEPS = [
  'Reading the situation...',
  'Calibrating the tone...',
  'Writing the friendly version...',
  'Writing the firm version...',
  'Writing the final notice...',
  'Reviewing the language...',
]

interface Email {
  tone: string
  subject: string
  body: string
}

const TONE_META: Record<string, { label: string; desc: string; accent: string }> = {
  friendly: { label: 'Friendly',     desc: 'Assume it slipped their mind.',     accent: 'border-gray-300' },
  firm:     { label: 'Firm',         desc: 'Direct. Asks for a specific date.',  accent: 'border-gray-500' },
  final:    { label: 'Final Notice', desc: 'Last message before action.',        accent: 'border-gray-900' },
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

interface Client { id: string; name: string }

export function NudgeGenerator({
  initialContext = '',
  initialClientId = '',
  clients = [],
}: {
  initialContext?: string
  initialClientId?: string
  clients?: Client[]
}) {
  const [context, setContext] = useState(initialContext)
  const [clientId, setClientId] = useState(initialClientId)
  const [submittedContext, setSubmittedContext] = useState('')
  const [emails, setEmails] = useState<Email[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, emails])

  async function generate(ctx: string) {
    setSubmittedContext(ctx)
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
      if (!res.ok) { setError(data.error === 'NO_API_KEY' ? 'No API key set.' : 'Something went wrong.'); return }
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

  async function handleSave() {
    if (!emails || !submittedContext) return
    setSaving(true)
    try {
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: submittedContext, emails, clientId: clientId || null }),
      })
      const data = await res.json()
      if (res.ok) setSavedId(data.id)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setContext('')
    setSubmittedContext('')
    setEmails(null)
    setError(null)
    setSavedId(null)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-start gap-3">
            <AiAvatar />
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4 max-w-lg">
              <p className="text-sm text-gray-700 leading-relaxed">Describe the invoice and client — I'll write three follow-up emails at different tones.</p>
            </div>
          </div>

          {submittedContext && (
            <>
              <UserBubble text={submittedContext} />

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

              {emails && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-medium text-gray-800 px-1">Three follow-ups ready</p>
                    {emails.map((email) => {
                      const meta = TONE_META[email.tone] ?? { label: email.tone, desc: '', accent: 'border-gray-200' }
                      return (
                        <div key={email.tone} className={`rounded-2xl border-l-4 border border-gray-100 bg-white shadow-sm overflow-hidden ${meta.accent}`}>
                          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{meta.label}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>
                            </div>
                            <button type="button" onClick={() => copy(`Subject: ${email.subject}\n\n${email.body}`, `${email.tone}-all`)}
                              className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                              {copied === `${email.tone}-all` ? 'Copied!' : 'Copy all'}
                            </button>
                          </div>
                          <div className="px-5 pb-5 pt-2 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-1">Subject</p>
                                <p className="text-sm font-medium text-gray-900 leading-snug">{email.subject}</p>
                              </div>
                              <button type="button" onClick={() => copy(email.subject, `${email.tone}-subject`)}
                                className="shrink-0 text-xs text-gray-300 hover:text-gray-700 transition-colors mt-4">
                                {copied === `${email.tone}-subject` ? '✓' : 'Copy'}
                              </button>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">Body</p>
                                <button type="button" onClick={() => copy(email.body, `${email.tone}-body`)}
                                  className="text-xs text-gray-300 hover:text-gray-700 transition-colors">
                                  {copied === `${email.tone}-body` ? '✓' : 'Copy'}
                                </button>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-2xl">
          {clients.length > 0 && !emails && (
            <div className="mb-3">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                aria-label="Client (optional)"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
              >
                <option value="">Client (optional — links nudge to invoice)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {emails ? (
            <div className="flex items-center justify-between">
              {savedId ? (
                <span className="text-sm font-medium text-green-600">✓ Saved</span>
              ) : (
                <button type="button" onClick={handleSave} disabled={saving}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <div className="flex gap-4">
                <button type="button" onClick={() => { generate(submittedContext); setSavedId(null) }} disabled={loading}
                  className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors">
                  Regenerate
                </button>
                <button type="button" onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                  ← New request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                rows={3}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && context.trim()) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) } }}
                placeholder="e.g. Tunde Bakare, Apex Media. Invoice #004 for ₦250,000. Due May 1st, 18 days overdue. Gone quiet."
                className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-400">⌘↩ to generate</span>
                <button type="submit" disabled={!context.trim() || loading}
                  className="flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Generate follow-ups
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
