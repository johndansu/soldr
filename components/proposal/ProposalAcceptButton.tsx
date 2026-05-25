'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProposalAcceptButton({ token, proposalId }: { token: string; proposalId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  async function handleAccept() {
    setLoading(true)
    try {
      const res = await fetch('/api/proposals/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setAccepted(true)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-5 py-2.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5"/><path d="M5 8l2 2.5 4-4"/>
        </svg>
        <span className="text-sm font-medium">Accepted</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Accepting…' : 'Accept proposal'}
    </button>
  )
}
