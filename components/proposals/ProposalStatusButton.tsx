'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const STATUSES: { value: ProposalStatus; label: string; pill: string }[] = [
  { value: 'draft',    label: 'Draft',    pill: 'bg-gray-100 text-gray-500' },
  { value: 'sent',     label: 'Sent',     pill: 'bg-blue-50 text-blue-600' },
  { value: 'accepted', label: 'Accepted', pill: 'bg-green-50 text-green-700' },
  { value: 'rejected', label: 'Rejected', pill: 'bg-red-50 text-red-500' },
  { value: 'expired',  label: 'Expired',  pill: 'bg-orange-50 text-orange-500' },
]

export function ProposalStatusButton({ proposalId, initialStatus }: { proposalId: string; initialStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<ProposalStatus>((initialStatus as ProposalStatus) ?? 'draft')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0]

  async function handleSelect(next: ProposalStatus) {
    if (next === status) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setStatus(next)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors cursor-pointer ${current.pill} ${saving ? 'opacity-60' : ''}`}
      >
        {saving ? '…' : current.label}
        <span className="ml-1 opacity-50">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden py-1">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleSelect(s.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 flex items-center gap-2 ${s.value === status ? 'font-semibold' : ''}`}
              >
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.pill}`}>{s.label}</span>
                {s.value === status && <span className="ml-auto text-gray-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
