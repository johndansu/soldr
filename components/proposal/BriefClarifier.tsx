'use client'

import { useState, useEffect } from 'react'
import { ThinkingState } from '@/components/ui/ThinkingState'

const THINKING_STEPS = [
  'Reading your brief...',
  'Identifying what\'s missing...',
  'Preparing clarifying questions...',
  'Almost ready...',
]

interface Props {
  brief: string
  onEnrichment: (enrichedBrief: string) => void
  onSkip: () => void
}

export function BriefClarifier({ brief, onEnrichment, onSkip }: Props) {
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', ''])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuestions() {
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
            : 'Could not generate questions.')
          return
        }
        setQuestions(data.questions)
      } catch {
        setError('Something went wrong.')
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [brief])

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

  if (loading) {
    return (
      <div className="space-y-3">
        <ThinkingState steps={THINKING_STEPS} />
        <button type="button" onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Skip — draft now
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <button type="button" onClick={onSkip}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          Draft now
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">Answer what you know — leave blank anything you don't have yet.</p>
      {questions!.map((q, i) => (
        <div key={i} className={`opacity-0 stagger-${i}`}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{q}</label>
          <textarea
            rows={2}
            value={answers[i]}
            onChange={(e) => setAnswers(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
            placeholder="Leave blank if unknown"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 transition-shadow"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1 opacity-0 stagger-5">
        <button type="submit"
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          Draft with context
        </button>
        <button type="button" onClick={onSkip}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">
          Skip answers
        </button>
      </div>
    </form>
  )
}
