'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/app/api/search/route'

const TYPE_META: Record<SearchResult['type'], { label: string; icon: React.ReactNode }> = {
  client: {
    label: 'Client',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2.5" /><path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4" />
        <path d="M11.5 3.5a2.5 2.5 0 0 1 0 5" /><path d="M15 13.5c0-2-1.5-3.5-3.5-3.5" />
      </svg>
    ),
  },
  proposal: {
    label: 'Proposal',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" />
        <path d="M9 1v5h5M5 9h6M5 12h4" />
      </svg>
    ),
  },
  invoice: {
    label: 'Invoice',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 5h6M5 8h6M5 11h4" />
      </svg>
    ),
  },
  project: {
    label: 'Project',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="14" height="10" rx="1.5" /><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M5 9h6" />
      </svg>
    ),
  },
  contract: {
    label: 'Contract',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/>
        <path d="M9 1v5h5"/><path d="M5 10h6M5 12.5h3"/><path d="M5 7.5l1 1 2-2"/>
      </svg>
    ),
  },
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2) { setResults([]); setLoading(false); return }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setActiveIndex(0)
        }
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const navigate = useCallback((href: string) => {
    onClose()
    router.push(href)
  }, [onClose, router])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[activeIndex]) { navigate(results[activeIndex].href) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, results, activeIndex, navigate, onClose])

  if (!open) return null

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})
  const typeOrder: SearchResult['type'][] = ['client', 'proposal', 'invoice', 'project']
  const flatResults = typeOrder.flatMap((t) => grouped[t] ?? [])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[15vh] z-50 mx-auto max-w-xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients, proposals, invoices, projects…"
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            />
            {loading && (
              <svg className="animate-spin shrink-0 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            )}
            <kbd className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Esc</kbd>
          </div>

          {/* Results */}
          {flatResults.length > 0 ? (
            <div className="py-1.5 max-h-80 overflow-y-auto">
              {typeOrder.map((type) => {
                const items = grouped[type]
                if (!items?.length) return null
                const meta = TYPE_META[type]
                return (
                  <div key={type}>
                    <p className="px-4 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                      {meta.label}s
                    </p>
                    {items.map((result) => {
                      const idx = flatResults.indexOf(result)
                      const isActive = idx === activeIndex
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => navigate(result.href)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-gray-50' : ''}`}
                        >
                          <span className={`shrink-0 ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                            {meta.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-900 truncate">{result.label}</span>
                            {result.sub && <span className="block text-xs text-gray-400 truncate mt-0.5">{result.sub}</span>}
                          </span>
                          {isActive && (
                            <kbd className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">↵</kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">No results for <span className="font-medium text-gray-600">"{query}"</span></p>
            </div>
          ) : query.length === 0 ? (
            <div className="py-6 px-4">
              <p className="text-xs text-gray-400 mb-3">Quick links</p>
              <div className="space-y-1">
                {[
                  { label: 'New client',   href: '/dashboard/clients/new' },
                  { label: 'New proposal', href: '/dashboard/proposals/new' },
                  { label: 'New invoice',  href: '/dashboard/invoices/new' },
                  { label: 'New project',  href: '/dashboard/projects/new' },
                ].map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => navigate(link.href)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
                      <path d="M8 3v10M3 8h10"/>
                    </svg>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Footer hint */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <kbd className="rounded border border-gray-200 px-1 py-0.5 text-[9px]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <kbd className="rounded border border-gray-200 px-1 py-0.5 text-[9px]">↵</kbd> open
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <kbd className="rounded border border-gray-200 px-1 py-0.5 text-[9px]">Esc</kbd> close
            </span>
          </div>

        </div>
      </div>
    </>
  )
}
