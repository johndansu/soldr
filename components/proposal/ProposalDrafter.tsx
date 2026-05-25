'use client'

import { useState, useRef, useEffect } from 'react'
import { useCompletion } from '@ai-sdk/react'
import Link from 'next/link'
import { BriefClarifier } from './BriefClarifier'
import { ProposalMarkdown } from './ProposalMarkdown'
import { ThinkingState } from '@/components/ui/ThinkingState'

type Step = 'input' | 'clarify' | 'generating' | 'done'

function AiAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center shrink-0">
      <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
        <path d="M9.5 2.5 C4 2.5,4 7,7 7 C10 7,10 11.5,4.5 11.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}


const PROPOSAL_THINKING_STEPS = [
  'Reading your brief...',
  'Identifying the key requirements...',
  'Thinking about the right angle...',
  'Structuring the proposal...',
  'Writing the introduction...',
  'Drafting the scope of work...',
  'Adding pricing and timeline...',
  'Polishing the language...',
]

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="rounded-2xl bg-gray-900 text-white px-5 py-3.5 max-w-xl text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}

export function ProposalDrafter() {
  const [brief, setBrief] = useState('')
  const [enrichedBrief, setEnrichedBrief] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [title, setTitle] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai/proposal',
    streamProtocol: 'text',
    onFinish: () => setStep('done'),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [step, completion])

  async function startGeneration(enriched: string) {
    setEnrichedBrief(enriched)
    setSavedId(null)
    setTitle('')
    setSaveError(null)
    setStep('generating')
    await complete(enriched)
  }

  function handleBriefSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brief.trim()) return
    setStep('clarify')
  }

  function handleReset() {
    setBrief('')
    setEnrichedBrief('')
    setTitle('')
    setSavedId(null)
    setSaveError(null)
    setStep('input')
  }

  function handleDownload() {
    const blob = new Blob([completion], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.trim() || 'proposal'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleGenerateTitle() {
    setGeneratingTitle(true)
    try {
      const res = await fetch('/api/ai/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: enrichedBrief || brief }),
      })
      const data = await res.json()
      if (data.title) setTitle(data.title)
    } finally {
      setGeneratingTitle(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || null, content: completion, briefInput: enrichedBrief || brief }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError('Could not save. Try again.'); return }
      setSavedId(data.id)
    } catch {
      setSaveError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-start gap-3">
            <AiAvatar />
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4 max-w-lg">
              <p className="text-sm text-gray-700 leading-relaxed">Paste a client brief — the messier the better. Budget, timeline, goals, anything.</p>
            </div>
          </div>

          {step !== 'input' && (
            <>
              <UserBubble text={brief} />

              {step === 'clarify' && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-5">
                    <p className="text-sm font-medium text-gray-800 mb-1">A few quick questions</p>
                    <p className="text-xs text-gray-400 mb-4">Answer what you know — sharper brief, sharper proposal.</p>
                    <BriefClarifier
                      brief={brief}
                      onEnrichment={(enriched) => startGeneration(enriched)}
                      onSkip={() => startGeneration(brief)}
                    />
                  </div>
                </div>
              )}

              {(step === 'generating' || step === 'done') && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm px-6 py-5 min-h-32">
                    {step === 'generating' && !completion && <ThinkingState steps={PROPOSAL_THINKING_STEPS} />}
                    {step === 'generating' && completion && (
                      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {completion}<span className="cursor-blink text-gray-400">▌</span>
                      </div>
                    )}
                    {step === 'done' && completion && <ProposalMarkdown content={completion} />}
                    {error && (
                      <p className="text-sm text-red-500">
                        {error.message.includes('NO_API_KEY') ? 'No API key set — go to Settings to add yours.' : 'Something went wrong. Please try again.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {step === 'input' && (
        <div className="shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleBriefSubmit} className="space-y-2">
              <textarea
                rows={4}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && brief.trim()) { e.preventDefault(); handleBriefSubmit(e as unknown as React.FormEvent) } }}
                placeholder="Paste what the client told you..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-400">⌘↩ to continue</span>
                <button
                  type="submit"
                  disabled={!brief.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Continue
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {step === 'done' && completion && (
        <div className="shrink-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto max-w-2xl">
            {savedId ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">✓ Saved to proposals</span>
                <div className="flex items-center gap-4">
                  <Link href={`/dashboard/proposals/${savedId}`} className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2">View →</Link>
                  <button type="button" onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-700">← New brief</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give this proposal a title..."
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
                  />
                  <button type="button" onClick={handleGenerateTitle} disabled={generatingTitle}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
                    {generatingTitle ? '...' : 'Generate'}
                  </button>
                </div>
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save to proposals'}
                  </button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(completion)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Copy
                  </button>
                  <button type="button" onClick={handleDownload}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    ↓ .md
                  </button>
                  <button type="button" onClick={handleReset}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50">
                    ← New
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
