'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const
type Status = typeof STATUSES[number]

const LABEL_STYLE: Record<Status, string> = {
  active:    'text-green-700',
  paused:    'text-amber-700',
  completed: 'text-blue-700',
  cancelled: 'text-gray-500',
}

export function ProjectStatusButton({ id, status: initial }: { id: string; status: Status }) {
  const router = useRouter()
  const [status, setStatus] = useState(initial)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function select(next: Status) {
    if (next === status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setStatus(next)
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`text-xs font-medium capitalize transition-colors disabled:opacity-50 ${LABEL_STYLE[status]}`}
      >
        {loading ? '…' : status}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 bottom-6 z-20 w-36 rounded-xl border border-gray-200 bg-white shadow-lg py-1 overflow-hidden">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => select(s)}
                className="w-full text-left px-3.5 py-2 text-xs capitalize hover:bg-gray-50 flex items-center justify-between"
              >
                <span className={LABEL_STYLE[s]}>{s}</span>
                {s === status && <span className="text-gray-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
