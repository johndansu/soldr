'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RecurringToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter()
  const [on, setOn] = useState(active)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await fetch(`/api/invoice-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !on }),
      })
      setOn((v) => !v)
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <button type="button" onClick={toggle} disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${on ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function GenerateNowButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoice-templates/${id}/run`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.invoiceId) {
        setDone(true)
        router.push(`/dashboard/invoices/${data.invoiceId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={run} disabled={loading || done}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
      {loading ? 'Generating…' : done ? 'Done ✓' : 'Generate now'}
    </button>
  )
}

export function DeleteTemplateButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoice-templates/${id}`, { method: 'DELETE' })
      if (res.ok) { router.refresh() }
    } finally { setLoading(false) }
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1.5">
        <button type="button" onClick={handleDelete} disabled={loading}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
          {loading ? '…' : 'Confirm'}
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </span>
    )
  }

  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="text-xs text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
      Delete
    </button>
  )
}
