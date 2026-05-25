'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'draft',  label: 'Draft',  cls: 'bg-gray-100 text-gray-500' },
  { value: 'sent',   label: 'Sent',   cls: 'bg-blue-50 text-blue-600' },
  { value: 'signed', label: 'Signed', cls: 'bg-green-50 text-green-700' },
]

interface Props {
  contractId: string
  initialStatus: string
}

export function ContractStatusButton({ contractId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0]

  async function handleSelect(value: string) {
    if (value === status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    await fetch(`/api/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: value }),
    })
    setStatus(value)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize cursor-pointer hover:opacity-80 transition-opacity ${current.cls}`}
      >
        {loading ? '…' : current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-gray-200 bg-white shadow-lg z-10 overflow-hidden">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSelect(s.value)}
              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
