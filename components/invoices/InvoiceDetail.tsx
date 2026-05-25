'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SendButton } from '@/components/ui/SendButton'
import { DownloadPDFButton } from '@/components/ui/DownloadPDFButton'

interface LineItem { description: string; qty: number; rate: number }
interface Payment { id: string; amount: number; paid_date: string; notes: string | null }

interface Invoice {
  id: string
  invoice_number: string | null
  amount: number
  currency: string
  due_date: string
  created_at: string
  status: string
  line_items: LineItem[] | null
  tax_rate: number | null
  discount: number | null
  discount_type: string | null
  notes: string | null
  description: string | null
  public_token: string | null
  clients: { name: string; email: string | null } | null
  proposal: { id: string; title: string | null } | null
}

interface Business {
  business_name: string | null
  business_email: string | null
  business_address: string | null
  business_phone: string | null
  bank_details: string | null
}

interface Props { invoice: Invoice; business: Business; payments: Payment[] }

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵',
}
function symOf(c: string) { return CURRENCY_SYMBOLS[c] ?? c }
function fmtNum(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtShortDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AMOUNT_CARD_STYLE: Record<string, string> = {
  paid:      'bg-green-600',
  overdue:   'bg-red-600',
  cancelled: 'bg-gray-400',
  unpaid:    'bg-gray-900',
}

const STATUS_PILL: Record<string, string> = {
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  unpaid:    'bg-amber-100 text-amber-700',
}

export function InvoiceDetail({ invoice, business, payments: initialPayments }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(invoice.status)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(
    invoice.public_token ? `/invoice/${invoice.public_token}` : null
  )
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNotes, setPayNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [removingPaymentId, setRemovingPaymentId] = useState<string | null>(null)

  const sym = symOf(invoice.currency)
  const lineItems = invoice.line_items ?? []
  const hasLineItems = lineItems.length > 0

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const discountAmt = invoice.discount_type === 'percentage'
    ? subtotal * (invoice.discount ?? 0) / 100
    : (invoice.discount ?? 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (invoice.tax_rate ?? 0) / 100
  const total = hasLineItems ? afterDiscount + taxAmt : invoice.amount

  const isOverdue = status === 'unpaid' && new Date(invoice.due_date) < new Date()
  const displayStatus = isOverdue ? 'overdue' : status
  const cardStyle = AMOUNT_CARD_STYLE[displayStatus] ?? AMOUNT_CARD_STYLE.unpaid
  const pillStyle = STATUS_PILL[displayStatus] ?? STATUS_PILL.unpaid

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = total - totalPaid
  const isFullyPaid = outstanding <= 0

  async function handleMarkPaid() {
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (res.ok) setStatus('paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  async function handleShare() {
    if (shareState === 'loading') return
    if (shareUrl) {
      await navigator.clipboard.writeText(window.location.origin + shareUrl)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2000)
      return
    }
    setShareState('loading')
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/share`, { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        setShareUrl(data.url)
        await navigator.clipboard.writeText(window.location.origin + data.url)
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2000)
      }
    } catch { setShareState('idle') }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (res.ok) router.push('/dashboard/invoices')
    } finally { setDeleting(false); setDeleteConfirm(false) }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payAmount || !payDate) return
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(payAmount), paidDate: payDate, notes: payNotes.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) {
        const newPayments = [...payments, data]
        setPayments(newPayments)
        const newTotalPaid = newPayments.reduce((s, p) => s + p.amount, 0)
        if (newTotalPaid >= total && status === 'unpaid') {
          setStatus('paid')
          await fetch(`/api/invoices/${invoice.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paid' }),
          })
        }
        setPayAmount('')
        setPayNotes('')
        setPayDate(new Date().toISOString().split('T')[0])
        setShowPaymentForm(false)
      }
    } finally {
      setSavingPayment(false)
    }
  }

  async function handleRemovePayment(paymentId: string) {
    setRemovingPaymentId(paymentId)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      if (res.ok) setPayments((p) => p.filter((x) => x.id !== paymentId))
    } finally {
      setRemovingPaymentId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Action bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/invoices"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 8H3M7 4l-4 4 4 4" />
          </svg>
          Invoices
        </Link>

        <div className="flex items-center gap-2">
          {(status === 'unpaid' || isOverdue) && (
            <button type="button" onClick={handleMarkPaid} disabled={markingPaid}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
              {markingPaid ? 'Saving…' : 'Mark as paid'}
            </button>
          )}
          {(status === 'unpaid' || isOverdue) && (
            <button type="button" onClick={() => setShowPaymentForm((v) => !v)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${showPaymentForm ? 'bg-gray-100 border-gray-300 text-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Record payment
            </button>
          )}
          {(status === 'unpaid' || isOverdue) && (
            <Link
              href={`/dashboard/nudge/new?invoiceId=${invoice.id}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Nudge client
            </Link>
          )}
          {invoice.clients?.email && (
            <SendButton
              endpoint={`/api/invoices/${invoice.id}/send`}
              label="Send to client"
              successLabel="Sent!"
            />
          )}
          <DownloadPDFButton
            endpoint={`/api/invoices/${invoice.id}/pdf`}
            filename={`${invoice.invoice_number ?? 'invoice'}.pdf`}
          />
          <button type="button" onClick={() => window.print()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Print
          </button>
          <button type="button" onClick={handleShare}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            {shareState === 'loading' ? 'Generating…' : shareState === 'copied' ? '✓ Copied' : shareUrl ? 'Copy link' : 'Share'}
          </button>
          {deleteConfirm ? (
            <>
              <button type="button" onClick={() => setDeleteConfirm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Confirm'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setDeleteConfirm(true)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:rounded-none print:shadow-none print:border-0">

        {/* Header: company + amount due */}
        <div className="px-8 pt-8 pb-7">
          <div className="flex items-start justify-between gap-8">

            {/* Company */}
            <div className="space-y-0.5 min-w-0">
              {business.business_name ? (
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {business.business_name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-[15px]">{business.business_name}</span>
                </div>
              ) : null}
              {business.business_email   && <p className="text-sm text-gray-400">{business.business_email}</p>}
              {business.business_phone   && <p className="text-sm text-gray-400">{business.business_phone}</p>}
              {business.business_address && <p className="text-sm text-gray-400">{business.business_address}</p>}
            </div>

            {/* Invoice # + Amount Due card */}
            <div className="shrink-0 text-right space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{invoice.invoice_number ?? '—'}</p>
              </div>
              <div className={`${cardStyle} rounded-2xl px-6 py-4 text-white text-right min-w-[200px] transition-colors duration-300`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-1">Amount due</p>
                <p className="text-3xl font-bold tabular-nums leading-none">{sym}{fmtNum(total)}</p>
                <p className="text-xs opacity-70 mt-2">Due {fmtShortDate(invoice.due_date)}</p>
              </div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${pillStyle}`}>
                {displayStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Bill to + dates */}
        <div className="px-8 py-6 grid grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Billed to</p>
            <p className="text-sm font-semibold text-gray-900">{invoice.clients?.name ?? '—'}</p>
            {invoice.clients?.email && <p className="text-xs text-gray-400 mt-0.5">{invoice.clients.email}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Invoice date</p>
            <p className="text-sm text-gray-700">{fmtDate(invoice.created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Due date</p>
            <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{fmtDate(invoice.due_date)}</p>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-8" />

        {/* Line items */}
        <div className="px-8 py-6">
          {hasLineItems ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-14">Qty</th>
                  <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-32">Rate</th>
                  <th className="pb-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3.5 text-sm text-gray-800">{item.description || '—'}</td>
                    <td className="py-3.5 text-sm text-right text-gray-500 tabular-nums">{item.qty}</td>
                    <td className="py-3.5 text-sm text-right text-gray-500 tabular-nums">{sym}{fmtNum(item.rate)}</td>
                    <td className="py-3.5 text-sm text-right font-semibold text-gray-900 tabular-nums">{sym}{fmtNum(item.qty * item.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-600">{invoice.description ?? '—'}</p>
          )}
        </div>

        {/* Totals */}
        <div className="px-8 pb-6">
          <div className="ml-auto w-60 space-y-2 pt-4 border-t border-gray-100">
            {hasLineItems && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{sym}{fmtNum(subtotal)}</span>
              </div>
            )}
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Discount{invoice.discount_type === 'percentage' ? ` (${invoice.discount}%)` : ''}</span>
                <span className="tabular-nums text-red-500">−{sym}{fmtNum(discountAmt)}</span>
              </div>
            )}
            {taxAmt > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax ({invoice.tax_rate}%)</span>
                <span className="tabular-nums">+{sym}{fmtNum(taxAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px] font-bold text-gray-900 pt-3 border-t border-gray-200">
              <span>Total</span>
              <span className="tabular-nums">{sym}{fmtNum(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment history + record form */}
        {(payments.length > 0 || showPaymentForm) && (
          <>
            <div className="h-px bg-gray-100 mx-8" />
            <div className="px-8 py-6 space-y-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Payments received</p>

              {payments.length > 0 && (
                <div className="space-y-0">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 tabular-nums">{sym}{fmtNum(p.amount)}</p>
                          {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-400">
                          {new Date(p.paid_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(p.id)}
                          disabled={removingPaymentId === p.id}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 disabled:opacity-50 transition-opacity text-xs"
                        >
                          {removingPaymentId === p.id ? '…' : '×'}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Outstanding</span>
                    <span className={`text-sm font-bold tabular-nums ${isFullyPaid ? 'text-green-600' : 'text-gray-900'}`}>
                      {isFullyPaid ? 'Fully paid' : `${sym}${fmtNum(outstanding)}`}
                    </span>
                  </div>
                </div>
              )}

              {showPaymentForm && (
                <form onSubmit={handleRecordPayment} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500">Record a payment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym}</span>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="0.00"
                          aria-label="Payment amount"
                          required
                          className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Date</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        aria-label="Payment date"
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="e.g. Bank transfer, first instalment"
                      aria-label="Payment notes"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="submit" disabled={savingPayment || !payAmount}
                      className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
                      {savingPayment ? 'Saving…' : 'Save payment'}
                    </button>
                    <button type="button" onClick={() => setShowPaymentForm(false)}
                      className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

        {/* Notes + payment details */}
        {(invoice.notes || business.bank_details) && (
          <>
            <div className="h-px bg-gray-100 mx-8" />
            <div className="px-8 py-6 grid grid-cols-2 gap-8">
              {invoice.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {business.bank_details && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment details</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{business.bank_details}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Card footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 print:hidden flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {invoice.invoice_number && <span className="font-medium text-gray-600">{invoice.invoice_number} · </span>}
            Generated with Soldr
          </p>
          {invoice.proposal && (
            <Link
              href={`/dashboard/proposals/${invoice.proposal.id}`}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" />
                <path d="M9 1v5h5" />
              </svg>
              {invoice.proposal.title ?? 'View proposal'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
