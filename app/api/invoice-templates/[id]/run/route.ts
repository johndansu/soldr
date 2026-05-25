import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function nextRunDate(current: string, frequency: string): string {
  const d = new Date(current + 'T00:00:00')
  if (frequency === 'weekly')    d.setDate(d.getDate() + 7)
  if (frequency === 'monthly')   d.setMonth(d.getMonth() + 1)
  if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
  return d.toISOString().split('T')[0]
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: template } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!template) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Compute due date and invoice total
  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + (template.due_days_after ?? 7))
  const dueDateStr = dueDate.toISOString().split('T')[0]

  type LineItem = { description: string; qty: number; rate: number }
  const items = (template.line_items as LineItem[]) ?? []
  const subtotal = items.reduce((s: number, i: LineItem) => s + i.qty * i.rate, 0)
  const discountAmt = template.discount_type === 'percentage'
    ? subtotal * (template.discount ?? 0) / 100
    : (template.discount ?? 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (template.tax_rate ?? 0) / 100
  const total = afterDiscount + taxAmt

  // Auto-generate invoice number
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

  // Create the invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id:       user.id,
      client_id:     template.client_id,
      invoice_number: invoiceNumber,
      description:   template.name,
      amount:        total,
      currency:      template.currency,
      due_date:      dueDateStr,
      line_items:    template.line_items,
      tax_rate:      template.tax_rate,
      discount:      template.discount,
      discount_type: template.discount_type,
      notes:         template.notes,
      template_id:   template.id,
      status:        'unpaid',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })

  // Advance next_run_date
  await supabase
    .from('invoice_templates')
    .update({ next_run_date: nextRunDate(template.next_run_date, template.frequency) })
    .eq('id', template.id)

  return Response.json({ invoiceId: invoice.id }, { status: 201 })
}
