'use client'

import { useState } from 'react'

export function DownloadPDFButton({ endpoint, filename }: { endpoint: string; filename: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(endpoint)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v8M5 7l3 3 3-3" />
        <path d="M2 12h12" />
      </svg>
      {loading ? 'Generating…' : 'Download PDF'}
    </button>
  )
}
