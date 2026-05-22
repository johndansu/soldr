'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled'] as const
type Status = typeof STATUSES[number]

const STATUS_STYLE: Record<Status, string> = {
  unpaid:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:      'bg-green-50 text-green-700 border-green-200',
  overdue:   'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
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
      className={`rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer focus:outline-none disabled:opacity-50 ${STATUS_STYLE[current]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
