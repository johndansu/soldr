'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BriefClarifier } from './BriefClarifier'

type Step = 'input' | 'clarify' | 'generating' | 'done'

export function ProposalDrafter() {
  const [brief, setBrief] = useState('')
  const [step, setStep] = useState<Step>('input')

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai/proposal',
    streamProtocol: 'text',
  })

  async function startGeneration(enrichedBrief: string) {
    setStep('generating')
    await complete(enrichedBrief)
    setStep('done')
  }

  function handleBriefSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brief.trim()) return
    setStep('clarify')
  }

  function handleReset() {
    setBrief('')
    setStep('input')
  }

  if (step === 'generating' || step === 'done') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isLoading ? 'Writing proposal...' : 'Proposal ready'}
          </h2>
          {!isLoading && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(completion)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                New proposal
              </button>
            </div>
          )}
        </div>

        <div className="min-h-64 rounded-lg border border-gray-200 bg-white p-6">
          {completion ? (
            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-center prose-table:text-sm prose-td:py-2 prose-th:py-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{completion}</ReactMarkdown>
            </div>
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
      </div>
    )
  }

  if (step === 'clarify') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sharpen the brief</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            A few answers make for a much sharper proposal.
          </p>
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
