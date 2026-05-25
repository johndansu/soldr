import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/ui/PrintButton'

interface LineItem { description: string; qty: number; rate: number }

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

const AMOUNT_CARD: Record<string, string> = {
  paid: 'bg-green-600', overdue: 'bg-red-600', cancelled: 'bg-gray-400', unpaid: 'bg-gray-900',
}
const STATUS_PILL: Record<string, string> = {
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500', unpaid: 'bg-amber-100 text-amber-700',
}

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, created_at, status, line_items, tax_rate, discount, discount_type, notes, description, user_id, clients(name, email)')
    .eq('public_token', params.token)
    .single()

  if (!invoice) return notFound()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name, business_email, business_address, business_phone, bank_details, logo_url')
    .eq('user_id', invoice.user_id)
    .single()

  const clientRaw = invoice.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  const sym = symOf(invoice.currency)
  const lineItems = (invoice.line_items as LineItem[]) ?? []
  const hasLineItems = lineItems.length > 0

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const discountAmt = invoice.discount_type === 'percentage'
    ? subtotal * (invoice.discount ?? 0) / 100
    : (invoice.discount ?? 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (invoice.tax_rate ?? 0) / 100
  const total = hasLineItems ? afterDiscount + taxAmt : invoice.amount

  const isOverdue = invoice.status === 'unpaid' && new Date(invoice.due_date) < new Date()
  const displayStatus = isOverdue ? 'overdue' : invoice.status
  const cardStyle = AMOUNT_CARD[displayStatus] ?? AMOUNT_CARD.unpaid
  const pillStyle = STATUS_PILL[displayStatus] ?? STATUS_PILL.unpaid

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">

        <div className="flex justify-end mb-4 print:hidden">
          <PrintButton />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:rounded-none print:shadow-none print:border-0">

          {/* Header */}
          <div className="px-8 pt-8 pb-7">
            <div className="flex items-start justify-between gap-8">
              <div className="space-y-0.5 min-w-0">
                {settings?.business_name ? (
                  <div className="flex items-center gap-2.5 mb-3">
                    {settings.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.logo_url} alt={settings.business_name} className="w-8 h-8 rounded-lg object-contain shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {settings.business_name[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-gray-900 text-[15px]">{settings.business_name}</span>
                  </div>
                ) : null}
                {settings?.business_email   && <p className="text-sm text-gray-400">{settings.business_email}</p>}
                {settings?.business_phone   && <p className="text-sm text-gray-400">{settings.business_phone}</p>}
                {settings?.business_address && <p className="text-sm text-gray-400">{settings.business_address}</p>}
              </div>

              <div className="shrink-0 text-right space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{invoice.invoice_number ?? '—'}</p>
                </div>
                <div className={`${cardStyle} rounded-2xl px-6 py-4 text-white text-right min-w-[200px]`}>
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
              <p className="text-sm font-semibold text-gray-900">{client?.name ?? '—'}</p>
              {client?.email && <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>}
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

          {/* Notes + payment details */}
          {(invoice.notes || settings?.bank_details) && (
            <>
              <div className="h-px bg-gray-100 mx-8" />
              <div className="px-8 py-6 grid grid-cols-2 gap-8">
                {invoice.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {settings?.bank_details && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment details</p>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{settings.bank_details}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 print:hidden">
            <p className="text-xs text-gray-400 text-center">
              {invoice.invoice_number && <span className="font-medium text-gray-500">{invoice.invoice_number} · </span>}
              Sent via <span className="font-medium">Soldr</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
