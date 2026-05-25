import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceEmail } from '@/lib/email'

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, public_token, clients(name, email)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client = (Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients) as { name: string; email: string | null } | null

  if (!client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name')
    .eq('user_id', user.id)
    .single()

  // Ensure public token exists
  let token = invoice.public_token
  if (!token) {
    const { data: updated } = await supabase
      .from('invoices')
      .update({ public_token: crypto.randomUUID() })
      .eq('id', invoice.id)
      .select('public_token')
      .single()
    token = updated?.public_token
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'
  const sym = SYMBOLS[invoice.currency] ?? invoice.currency
  const amount = `${sym}${invoice.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const dueDate = new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  try {
    await sendInvoiceEmail({
      to: client.email,
      clientName: client.name,
      businessName: settings?.business_name ?? 'Your supplier',
      invoiceNumber: invoice.invoice_number ?? `Invoice`,
      amount,
      dueDate,
      publicUrl: `${origin}/invoice/${token}`,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
