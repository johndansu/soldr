import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, currency, due_date, status, description, invoice_number, created_at, clients(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientId, invoiceNumber, dueDate, currency, description, lineItems, discount, discountType, taxRate, notes, proposalId, projectId } = body

  if (!clientId || !dueDate) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Compute total from line items
  const items = (lineItems as Array<{ description: string; qty: number; rate: number }>) || []
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0)
  const discountAmt = discountType === 'percentage'
    ? subtotal * (discount || 0) / 100
    : (discount || 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (taxRate || 0) / 100
  const total = afterDiscount + taxAmt

  // Resolve invoice number — auto-generate if not provided
  let finalInvoiceNumber = invoiceNumber?.trim() || null
  const { data: settings } = await supabase
    .from('user_settings')
    .select('invoice_sequence, invoice_prefix')
    .eq('user_id', user.id)
    .single()

  const nextSeq = (settings?.invoice_sequence ?? 0) + 1
  const prefix = settings?.invoice_prefix?.trim().toUpperCase() || 'INV'
  if (!finalInvoiceNumber) {
    finalInvoiceNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`
  }
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, invoice_sequence: nextSeq }, { onConflict: 'user_id' })

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      client_id: clientId,
      invoice_number: finalInvoiceNumber,
      amount: total,
      currency: currency || 'NGN',
      due_date: dueDate,
      description: description || null,
      line_items: items,
      tax_rate: taxRate || 0,
      discount: discount || 0,
      discount_type: discountType || 'percentage',
      notes: notes || null,
      proposal_id: proposalId || null,
      project_id: projectId || null,
      status: 'unpaid',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
