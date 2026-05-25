'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Item { id: string; label: string }

export function ProjectLinkPanel({ projectId, clientId }: { projectId: string; clientId: string | null }) {
  const router = useRouter()
  const [proposals, setProposals] = useState<Item[]>([])
  const [invoices, setInvoices] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    async function load() {
      const [pRes, iRes] = await Promise.all([
        fetch('/api/projects/unlinked?type=proposals'),
        fetch('/api/projects/unlinked?type=invoices'),
      ])
      if (pRes.ok) setProposals(await pRes.json())
      if (iRes.ok) setInvoices(await iRes.json())
    }
    load()
  }, [open])

  async function link(table: 'proposals' | 'invoices', id: string) {
    setLinking(id)
    try {
      await fetch(`/api/projects/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, projectId }),
      })
      if (table === 'proposals') setProposals((p) => p.filter((x) => x.id !== id))
      else setInvoices((p) => p.filter((x) => x.id !== id))
      router.refresh()
    } finally { setLinking(null) }
  }

  const hasItems = proposals.length > 0 || invoices.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
        Link existing proposal or invoice
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
          {!hasItems && <p className="text-sm text-gray-400">No unlinked proposals or invoices found.</p>}

          {proposals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Proposals</p>
              <div className="space-y-1.5">
                {proposals.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 truncate">{p.label}</span>
                    <button
                      type="button"
                      disabled={linking === p.id}
                      onClick={() => link('proposals', p.id)}
                      className="shrink-0 text-xs font-medium text-gray-900 hover:underline disabled:opacity-50"
                    >
                      {linking === p.id ? 'Linking…' : 'Link'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Invoices</p>
              <div className="space-y-1.5">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 truncate">{inv.label}</span>
                    <button
                      type="button"
                      disabled={linking === inv.id}
                      onClick={() => link('invoices', inv.id)}
                      className="shrink-0 text-xs font-medium text-gray-900 hover:underline disabled:opacity-50"
                    >
                      {linking === inv.id ? 'Linking…' : 'Link'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
