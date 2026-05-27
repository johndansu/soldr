import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { entryIds, dueDate } = await req.json()
  if (!entryIds?.length || !dueDate) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  // Fetch selected entries
  const { data: entries, error: fetchErr } = await supabase
    .from('time_entries')
    .select('id, client_id, date, hours, description, rate, currency')
    .in('id', entryIds)
    .eq('user_id', user.id)
    .eq('invoiced', false)

  if (fetchErr || !entries?.length) {
    return Response.json({ error: 'ENTRIES_NOT_FOUND' }, { status: 404 })
  }

  // All entries must share the same client and currency
  const clientId = entries[0].client_id
  const currency = entries[0].currency

  // Build line items
  const lineItems = entries.map((e) => ({
    description: `${e.description ?? 'Hours worked'} (${new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
    qty:  e.hours,
    rate: e.rate,
  }))

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)

  // Get invoice sequence + prefix
  const { data: settings } = await supabase
    .from('user_settings')
    .select('invoice_sequence, invoice_prefix')
    .eq('user_id', user.id)
    .single()

  const nextSeq = (settings?.invoice_sequence ?? 0) + 1
  const prefix = settings?.invoice_prefix?.trim().toUpperCase() || 'INV'
  const invoiceNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, invoice_sequence: nextSeq }, { onConflict: 'user_id' })

  // Create invoice
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      user_id:        user.id,
      client_id:      clientId,
      invoice_number: invoiceNumber,
      amount:         subtotal,
      currency,
      due_date:       dueDate,
      line_items:     lineItems,
      tax_rate:       0,
      discount:       0,
      discount_type:  'percentage',
      status:         'unpaid',
    })
    .select('id')
    .single()

  if (invoiceErr) return Response.json({ error: 'DB_ERROR' }, { status: 500 })

  // Mark entries as invoiced
  await supabase
    .from('time_entries')
    .update({ invoiced: true, invoice_id: invoice.id })
    .in('id', entryIds)
    .eq('user_id', user.id)

  return Response.json({ invoiceId: invoice.id }, { status: 201 })
}
