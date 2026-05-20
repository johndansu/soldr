'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import Link from 'next/link'
import { BriefClarifier } from './BriefClarifier'
import { ProposalMarkdown } from './ProposalMarkdown'

type Step = 'input' | 'clarify' | 'generating' | 'done'

export function ProposalDrafter() {
  const [brief, setBrief] = useState('')
  const [enrichedBrief, setEnrichedBrief] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titleSaved, setTitleSaved] = useState(false)

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai/proposal',
    streamProtocol: 'text',
    onFinish: async (_, fullCompletion) => {
      setStep('done')
      // Auto-save immediately on finish
      try {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: fullCompletion,
            briefInput: enrichedBrief || brief,
          }),
        })
        const data = await res.json()
        if (res.ok) setSavedId(data.id)
      } catch {
        // Silent — user can still copy/download
      }
    },
  })

  async function startGeneration(enriched: string) {
    setEnrichedBrief(enriched)
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
    setTitleSaved(false)
    setSavedId(null)
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

  async function handleSaveTitle(e: React.FormEvent) {
    e.preventDefault()
    if (!savedId || !title.trim()) return
    await fetch(`/api/proposals/${savedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setTitleSaved(true)
  }

  if (step === 'generating' || step === 'done') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isLoading ? 'Writing proposal...' : 'Proposal ready'}
          </h2>
          {!isLoading && (
            <button type="button" onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
              ← Start over
            </button>
          )}
        </div>

        <div className="min-h-64 rounded-lg border border-gray-200 bg-white p-6">
          {completion ? (
            <ProposalMarkdown content={completion} />
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
              Generating...
            </div>
          ) : (
            <p className="text-sm text-gray-400">No output received. Check server logs.</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error.message.includes('NO_API_KEY')
              ? 'No API key set. Go to Settings to add your key.'
              : 'Something went wrong. Please try again.'}
          </p>
        )}

        {!isLoading && completion && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {savedId ? '✓ Saved to your proposals' : 'Saving...'}
              </p>
              {savedId && (
                <Link
                  href={`/dashboard/proposals/${savedId}`}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  View saved →
                </Link>
              )}
            </div>

            <form onSubmit={handleSaveTitle} className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleSaved(false) }}
                placeholder="Add a title (optional)"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              <button
                type="submit"
                disabled={!title.trim() || !savedId}
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
              >
                {titleSaved ? 'Saved' : 'Save title'}
              </button>
            </form>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(completion)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download .md
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 'clarify') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sharpen the brief</h2>
          <p className="mt-0.5 text-sm text-gray-500">A few answers make for a much sharper proposal.</p>
        </div>
        <BriefClarifier
          brief={brief}
          onEnrichment={(enriched) => startGeneration(enriched)}
          onSkip={() => startGeneration(brief)}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleBriefSubmit} className="space-y-4">
      <div>
        <label htmlFor="brief" className="block text-sm font-medium text-gray-700">
          Client brief
        </label>
        <p className="mt-0.5 text-sm text-gray-500">
          Paste or type what the client told you — the messier the better.
        </p>
        <textarea
          id="brief"
          rows={8}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. I need a website for my fashion brand based in Lagos. Should have product listings, a cart, and support Paystack. Timeline is flexible but I need it before the end of Q2..."
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={!brief.trim()}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  )
}
