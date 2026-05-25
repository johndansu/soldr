'use client'

import { useState } from 'react'

interface Props {
  token: string
}

export function ContractShareButton({ token }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/contract/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 1H3a1 1 0 0 0-1 1v10"/><rect x="5" y="4" width="10" height="11" rx="1"/>
      </svg>
      {copied ? 'Link copied!' : 'Copy link'}
    </button>
  )
}
