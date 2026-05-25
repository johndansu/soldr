import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface IncomeReportData {
  currencies: string[]
  byCurrency: Record<string, CurrencyReport>
}

export interface CurrencyReport {
  currency: string
  summary: {
    billed: number
    collected: number
    outstanding: number
    overdue: number
    invoiceCount: number
  }
  byClient: ClientRow[]
  byMonth: MonthRow[]
  invoices: InvoiceRow[]
}

export interface ClientRow {
  clientId: string
  clientName: string
  billed: number
  collected: number
  outstanding: number
  overdue: number
  invoiceCount: number
}

export interface MonthRow {
  key: string   // "2026-01"
  label: string // "Jan 2026"
  billed: number
  collected: number
}

export interface InvoiceRow {
  id: string
  invoiceNumber: string
  clientName: string
  amount: number
  currency: string
  status: string
  dueDate: string
  createdAt: string
  partiallyPaid: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch invoices in the date range (by created_at)
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, status, due_date, paid_date, created_at, client_id, clients(name)')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  if (!invoices?.length) {
    return NextResponse.json({ currencies: [], byCurrency: {} })
  }

  const invoiceIds = invoices.map((i) => i.id)

  // Fetch partial payments for these invoices
  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('invoice_id, amount, paid_date')
    .eq('user_id', user.id)
    .in('invoice_id', invoiceIds)

  // Build partial payment map: invoiceId → total paid
  const partialMap = new Map<string, number>()
  for (const p of payments ?? []) {
    partialMap.set(p.invoice_id, (partialMap.get(p.invoice_id) ?? 0) + Number(p.amount))
  }

  const today = new Date().toISOString().slice(0, 10)

  // Group by currency
  const currencyMap = new Map<string, typeof invoices>()
  for (const inv of invoices) {
    const cur = inv.currency ?? 'NGN'
    if (!currencyMap.has(cur)) currencyMap.set(cur, [])
    currencyMap.get(cur)!.push(inv)
  }

  const byCurrency: Record<string, CurrencyReport> = {}

  for (const [currency, invs] of Array.from(currencyMap.entries())) {
    const clientMap = new Map<string, ClientRow>()
    const monthMap = new Map<string, MonthRow>()
    const rows: InvoiceRow[] = []

    let totalBilled = 0
    let totalCollected = 0
    let totalOutstanding = 0
    let totalOverdue = 0

    for (const inv of invs) {
      const amount = Number(inv.amount)
      const partial = partialMap.get(inv.id) ?? 0
      const isPaid = inv.status === 'paid'
      const isOverdue = inv.status === 'overdue' || (inv.status === 'unpaid' && inv.due_date < today)

      const collected = isPaid ? amount : partial
      const outstanding = Math.max(0, amount - collected)

      totalBilled += amount
      totalCollected += collected
      if (!isPaid) totalOutstanding += outstanding
      if (isOverdue && !isPaid) totalOverdue += outstanding

      // By client
      const clientRaw = inv.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
      const clientName = client?.name ?? 'Unknown client'
      const cid = inv.client_id

      if (!clientMap.has(cid)) {
        clientMap.set(cid, { clientId: cid, clientName, billed: 0, collected: 0, outstanding: 0, overdue: 0, invoiceCount: 0 })
      }
      const cr = clientMap.get(cid)!
      cr.billed += amount
      cr.collected += collected
      cr.outstanding += outstanding
      if (isOverdue && !isPaid) cr.overdue += outstanding
      cr.invoiceCount += 1

      // By month
      const monthKey = inv.created_at.slice(0, 7) // "2026-01"
      const monthLabel = new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { key: monthKey, label: monthLabel, billed: 0, collected: 0 })
      }
      const mr = monthMap.get(monthKey)!
      mr.billed += amount
      mr.collected += collected

      // Invoice row
      const clientRowRaw = inv.clients
      const clientRowObj = (Array.isArray(clientRowRaw) ? clientRowRaw[0] : clientRowRaw) as { name: string } | null
      rows.push({
        id: inv.id,
        invoiceNumber: inv.invoice_number ?? '—',
        clientName: clientRowObj?.name ?? '—',
        amount,
        currency,
        status: isOverdue && !isPaid ? 'overdue' : inv.status,
        dueDate: inv.due_date,
        createdAt: inv.created_at,
        partiallyPaid: partial,
      })
    }

    byCurrency[currency] = {
      currency,
      summary: {
        billed: totalBilled,
        collected: totalCollected,
        outstanding: totalOutstanding,
        overdue: totalOverdue,
        invoiceCount: invs.length,
      },
      byClient: Array.from(clientMap.values()).sort((a, b) => b.billed - a.billed),
      byMonth: Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key)),
      invoices: rows,
    }
  }

  return NextResponse.json({
    currencies: Array.from(currencyMap.keys()),
    byCurrency,
  } satisfies IncomeReportData)
}
