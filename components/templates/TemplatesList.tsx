'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Template { id: string; title: string; created_at: string }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TemplatesList({
  proposalTemplates: initialProposals,
  contractTemplates: initialContracts,
}: {
  proposalTemplates: Template[]
  contractTemplates: Template[]
}) {
  const router = useRouter()
  const [proposals, setProposals] = useState(initialProposals)
  const [contracts, setContracts] = useState(initialContracts)
  const [using, setUsing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function useTemplate(type: 'proposal' | 'contract', id: string) {
    setUsing(id)
    try {
      const res = await fetch(`/api/${type}-templates/${id}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) router.push(`/dashboard/${type}s/${data.id}`)
    } finally {
      setUsing(null)
    }
  }

  async function deleteTemplate(type: 'proposal' | 'contract', id: string) {
    setDeleting(id)
    await fetch(`/api/${type}-templates/${id}`, { method: 'DELETE' })
    if (type === 'proposal') setProposals((p) => p.filter((t) => t.id !== id))
    else setContracts((c) => c.filter((t) => t.id !== id))
    setDeleting(null)
  }

  const isEmpty = !proposals.length && !contracts.length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Reusable proposals and contracts. Save any document as a template from its detail page.</p>
        </div>
      </div>

      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No templates yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Open any proposal or contract and click <span className="font-medium">Save as template</span>.
          </p>
        </div>
      )}

      {proposals.length > 0 && (
        <TemplateSection
          title="Proposal templates"
          templates={proposals}
          type="proposal"
          using={using}
          deleting={deleting}
          onUse={(id) => useTemplate('proposal', id)}
          onDelete={(id) => deleteTemplate('proposal', id)}
        />
      )}

      {contracts.length > 0 && (
        <TemplateSection
          title="Contract templates"
          templates={contracts}
          type="contract"
          using={using}
          deleting={deleting}
          onUse={(id) => useTemplate('contract', id)}
          onDelete={(id) => deleteTemplate('contract', id)}
        />
      )}
    </div>
  )
}

function TemplateSection({
  title, templates, type, using, deleting, onUse, onDelete,
}: {
  title: string
  templates: Template[]
  type: 'proposal' | 'contract'
  using: string | null
  deleting: string | null
  onUse: (id: string) => void
  onDelete: (id: string) => void
}) {
  const icon = type === 'proposal'
    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/><path d="M9 1v5h5"/><path d="M5 9h6M5 12h4"/></svg>
    : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/><path d="M9 1v5h5"/><path d="M5 10h6M5 12.5h3"/><path d="M5 7.5l1 1 2-2"/></svg>

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-gray-400 shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onUse(t.id)}
                disabled={using === t.id}
                className="rounded-xl bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {using === t.id ? 'Creating…' : 'Use template'}
              </button>
              <button
                onClick={() => onDelete(t.id)}
                disabled={deleting === t.id}
                aria-label="Delete template"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                {deleting === t.id
                  ? <span className="text-xs text-gray-400">…</span>
                  : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10"/></svg>
                }
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
