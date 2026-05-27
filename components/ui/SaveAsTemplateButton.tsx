'use client'

import { useState } from 'react'

export function SaveAsTemplateButton({
  endpoint, title, content,
}: {
  endpoint: string
  title: string
  content: string
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleClick() {
    setState('saving')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      setState(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'saving' || state === 'saved'}
      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
    >
      {state === 'saving' ? 'Saving…'
        : state === 'saved' ? '✓ Saved as template'
        : state === 'error' ? 'Error — retry'
        : 'Save as template'}
    </button>
  )
}
