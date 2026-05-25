'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  endpoint: string
  body?: Record<string, unknown>
  label?: string
  successLabel?: string
  variant?: 'primary' | 'secondary'
  onSuccess?: () => void
}

export function SendButton({
  endpoint,
  body,
  label = 'Send',
  successLabel = 'Sent!',
  variant = 'secondary',
  onSuccess,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSend() {
    setState('sending')
    setErrorMsg('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to send')
        setState('error')
        return
      }
      setState('sent')
      onSuccess?.()
      router.refresh()
      setTimeout(() => setState('idle'), 4000)
    } catch {
      setErrorMsg('Network error')
      setState('error')
    }
  }

  const base = 'rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50'
  const styles = {
    primary: 'bg-gray-900 text-white hover:bg-gray-700',
    secondary: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
  }

  if (state === 'sent') {
    return (
      <span className={`${base} ${styles[variant]} text-green-700 border-green-200 bg-green-50`}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l3.5 3.5L13 4"/>
        </svg>
        {successLabel}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleSend}
        disabled={state === 'sending'}
        className={`${base} ${styles[variant]}`}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8l12-6-6 12V9L2 8Z"/>
        </svg>
        {state === 'sending' ? 'Sending…' : label}
      </button>
      {state === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}
    </div>
  )
}
