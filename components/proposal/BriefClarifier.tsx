'use client'

import { useState } from 'react'

interface Props {
  brief: string
  onEnrichment: (enrichedBrief: string) => void
  onSkip: () => void
}

export function BriefClarifier({ brief, onEnrichment, onSkip }: Props) {
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchQuestions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.code === 'NO_API_KEY'
          ? 'No API key set. Go to Settings to add your key.'
          : 'Could not generate questions. You can skip and draft directly.')
        return
      }
      setQuestions(data.questions)
    } catch {
      setError('Something went wrong. You can skip and draft directly.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const enriched = [
      brief,
      '',
      '---',
      'Additional context from discovery:',
      ...questions!.map((q, i) => answers[i].trim() ? `Q: ${q}\nA: ${answers[i].trim()}` : null).filter(Boolean),
    ].join('\n')
    onEnrichment(enriched)
  }

  if (!questions) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Before drafting, answer a few quick questions to get a sharper proposal — or skip and draft now.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchQuestions}
            disabled={loading}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Get clarifying questions'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Skip — draft now
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        Answer what you know — leave blank anything the client hasn't told you yet.
      </p>
      {questions.map((q, i) => (
        <div key={i}>
          <label className="block text-sm font-medium text-gray-700">{q}</label>
          <textarea
            rows={2}
            value={answers[i]}
            onChange={(e) => setAnswers(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
            placeholder="Leave blank if unknown"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Draft proposal with context
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Skip answers
        </button>
      </div>
    </form>
  )
}
