'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><rect x="2" y="4" width="12" height="8" rx="1"/>
        <path d="M4 11v3h8v-3"/>
      </svg>
      Print
    </button>
  )
}
