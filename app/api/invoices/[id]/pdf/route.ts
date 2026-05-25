import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { InvoicePDF } from '@/lib/pdf/InvoicePDF'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: invoice }, { data: settings }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, amount, currency, due_date, created_at, status, line_items, tax_rate, discount, discount_type, notes, description, clients(name, email)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_settings')
      .select('business_name, business_email, business_phone, business_address, bank_details')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('invoice_payments')
      .select('amount, paid_date, notes')
      .eq('invoice_id', params.id)
      .eq('user_id', user.id),
  ])

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clientRaw = invoice.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, {
      invoice: {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        status: invoice.status,
        line_items: invoice.line_items as { description: string; qty: number; rate: number }[] | null,
        tax_rate: invoice.tax_rate,
        discount: invoice.discount,
        discount_type: invoice.discount_type,
        notes: invoice.notes,
        description: invoice.description,
      },
      business: {
        business_name: settings?.business_name ?? null,
        business_email: settings?.business_email ?? null,
        business_phone: settings?.business_phone ?? null,
        business_address: settings?.business_address ?? null,
        bank_details: settings?.bank_details ?? null,
      },
      client,
      payments: (payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })),
    })
  )

  const filename = `${invoice.invoice_number ?? 'invoice'}.pdf`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
