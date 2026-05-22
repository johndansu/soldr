'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled'] as const
type Status = typeof STATUSES[number]

const STATUS_COLOR: Record<Status, string> = {
  unpaid:    'text-yellow-600',
  paid:      'text-green-600',
  overdue:   'text-red-600',
  cancelled: 'text-gray-400',
}

export function InvoiceStatusButton({ id, status }: { id: string; status: Status }) {
  const [current, setCurrent] = useState(status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(next: Status) {
    if (next === current) return
    setLoading(true)
    try {
      await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setCurrent(next)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value as Status)}
      disabled={loading}
      aria-label="Invoice status"
      className={`bg-transparent border-0 text-xs font-medium cursor-pointer focus:outline-none disabled:opacity-50 ${STATUS_COLOR[current]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>● {s}</option>
      ))}
    </select>
  )
}
