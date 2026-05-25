'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  endpoint: string
  redirectTo?: string
}

export function DeleteButton({ endpoint, redirectTo }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (res.ok) {
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={loading}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
          {loading ? 'Deleting…' : 'Confirm'}
        </button>
      </span>
    )
  }

  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="text-xs text-gray-300 hover:text-red-500 transition-colors">
      Delete
    </button>
  )
}
