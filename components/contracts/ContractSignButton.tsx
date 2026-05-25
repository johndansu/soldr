'use client'

import { useState } from 'react'

interface Props {
  token: string
  contractId: string
  clientName?: string
}

export function ContractSignButton({ token, contractId: _contractId, clientName = '' }: Props) {
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [state, setState] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const canSign = agreed && signedName.trim().length >= 2

  async function handleSign() {
    if (!canSign) return
    setState('signing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signedName: signedName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to sign')
        setState('error')
        return
      }
      setState('signed')
    } catch {
      setErrorMsg('Network error')
      setState('error')
    }
  }

  if (state === 'signed') {
    const signDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-8 py-8 text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="M3 8l3.5 3.5L13 4"/>
            </svg>
          </div>
        </div>
        <div>
          <p className="text-base font-semibold text-green-800">Contract signed</p>
          <p className="mt-1 text-sm text-green-600">Signed by {signedName} on {signDate}</p>
        </div>
        <div className="border-t border-green-200 pt-4">
          <p className="font-['Georgia',serif] text-2xl text-green-700 italic">{signedName}</p>
          <p className="mt-1 text-xs text-green-500">Electronic signature</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="sig-name" className="block text-sm font-semibold text-gray-900 mb-2">
          Type your full name to sign
        </label>
        <input
          id="sig-name"
          type="text"
          value={signedName}
          onChange={(e) => setSignedName(e.target.value)}
          placeholder={clientName || 'Full legal name'}
          autoComplete="name"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 transition-colors"
        />
        {signedName.trim().length >= 2 && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">Signature preview</p>
            <p className="font-['Georgia',serif] text-xl text-gray-700 italic">{signedName}</p>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            agreed ? 'bg-gray-900 border-gray-900' : 'border-gray-300 group-hover:border-gray-400'
          }`}>
            {agreed && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5"/>
              </svg>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          I confirm I am <strong className="text-gray-900">{signedName.trim() || 'the named party'}</strong> and I have read, understood, and agree to be bound by all terms of this agreement. I acknowledge that this electronic signature is legally binding.
        </p>
      </label>

      <button
        type="button"
        onClick={handleSign}
        disabled={!canSign || state === 'signing'}
        className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {state === 'signing' ? (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
              <path d="M8 1v3M8 12v3M1 8h3M12 8h3"/>
            </svg>
            Signing…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 13c1-1 3-3 4-5s3-3 5-2"/><path d="M10 6c1-2 3-4 4-3"/>
            </svg>
            Sign contract
          </>
        )}
      </button>

      {state === 'error' && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}
    </div>
  )
}
