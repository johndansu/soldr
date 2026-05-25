'use client'

import { useState, useRef, useEffect } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import { ContractDocument } from '@/components/contracts/ContractDocument'
import { ThinkingState } from '@/components/ui/ThinkingState'

const THINKING_STEPS = [
  'Reading the proposal scope...',
  'Drafting the parties and recitals...',
  'Structuring payment and milestones...',
  'Writing IP transfer clauses...',
  'Adding liability cap and warranties...',
  'Drafting termination and kill fee...',
  'Finalising governing law and signatures...',
]

const PAYMENT_TYPES = [
  { value: 'fixed',     label: 'Fixed price' },
  { value: 'hourly',    label: 'Hourly rate' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'retainer',  label: 'Monthly retainer' },
]

const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'GHS', 'CAD', 'AUD']

interface Props {
  proposalContent?: string
  proposalId?: string
  clientId?: string
  clientName?: string
  freelancerName?: string
}

export function ContractGenerator({
  proposalContent = '',
  proposalId,
  clientId,
  clientName = '',
  freelancerName = '',
}: Props) {
  const router = useRouter()

  // Form state
  const [paymentType, setPaymentType] = useState('fixed')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [paymentTerms, setPaymentTerms] = useState('50% deposit on signing, 50% on final delivery')
  const [revisionRounds, setRevisionRounds] = useState(2)
  const [killFee, setKillFee] = useState(25)
  const [jurisdiction, setJurisdiction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  // Save state
  const [title, setTitle] = useState('Freelance Service Agreement')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'generating' | 'done'>('input')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai/contract',
    streamProtocol: 'text',
    onFinish: () => setStep('done'),
  })

  useEffect(() => {
    if (completion) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [completion])

  async function handleGenerate() {
    setStep('generating')
    await complete('', {
      body: {
        proposalContent,
        freelancerName,
        clientName,
        paymentType,
        amount,
        currency,
        paymentTerms,
        revisionRounds,
        killFee,
        jurisdiction,
        startDate,
        endDate,
        notes,
      },
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: completion,
          clientId: clientId || undefined,
          proposalId: proposalId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error ?? 'Save failed'); return }
      router.push(`/dashboard/contracts/${data.id}`)
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'input') {
    return (
      <div className="space-y-4">
        {proposalContent && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 flex items-start gap-3">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 shrink-0 mt-0.5">
              <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/><path d="M9 1v5h5"/>
            </svg>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-600">Generating from proposal</p>
              <p className="mt-0.5 text-xs text-indigo-400 line-clamp-2 leading-relaxed">{proposalContent.slice(0, 200)}…</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Contract details</h2>
            <p className="mt-0.5 text-xs text-gray-400">Fill these in — the AI will produce a fully detailed agreement.</p>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Payment type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment structure</label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPaymentType(pt.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium text-center transition-all ${
                      paymentType === pt.value
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount + currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  {paymentType === 'hourly' ? 'Hourly rate' : paymentType === 'retainer' ? 'Monthly retainer' : 'Total fee'}
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 3,500"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label htmlFor="cg-currency" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Currency</label>
                <select
                  id="cg-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                >
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Payment terms */}
            <div>
              <label htmlFor="cg-payment-terms" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Payment schedule</label>
              <textarea
                id="cg-payment-terms"
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cg-start-date" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Start date</label>
                <input
                  id="cg-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label htmlFor="cg-end-date" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Est. completion</label>
                <input
                  id="cg-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </div>

            {/* Revisions + Kill fee + Jurisdiction */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="cg-revisions" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Revision rounds</label>
                <input
                  id="cg-revisions"
                  type="number"
                  title="Revision rounds included"
                  min={0}
                  max={20}
                  value={revisionRounds}
                  onChange={(e) => setRevisionRounds(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label htmlFor="cg-killfee" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Kill fee %</label>
                <input
                  id="cg-killfee"
                  type="number"
                  title="Kill fee percentage"
                  min={0}
                  max={100}
                  value={killFee}
                  onChange={(e) => setKillFee(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label htmlFor="cg-jurisdiction" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Jurisdiction</label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g. England and Wales"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Special clauses / notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Non-solicitation clause, source file handover details, custom payment milestones…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 1v6l3-3M8 7l-3-3"/>
                <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/>
              </svg>
              Generate contract
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isLoading && !completion && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <ThinkingState steps={THINKING_STEPS} />
        </div>
      )}

      {completion && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <ContractDocument content={completion} />
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-600">Generation failed. Check your API key in Settings and try again.</p>
        </div>
      )}

      {step === 'done' && completion && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Save contract</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="Contract title"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & continue'}
            </button>
          </div>
          {saveError && <p className="mt-2 text-xs text-red-500">{saveError}</p>}
        </div>
      )}
    </div>
  )
}
