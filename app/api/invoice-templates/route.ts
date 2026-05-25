import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoice_templates')
    .select('id, name, frequency, next_run_date, due_days_after, active, currency, clients(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const { clientId, name, frequency, nextRunDate, dueDaysAfter, lineItems, taxRate, discount, discountType, currency, notes } = body

  if (!clientId || !name || !frequency || !nextRunDate) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('invoice_templates')
    .insert({
      user_id: user.id,
      client_id: clientId,
      name: name.trim(),
      frequency,
      next_run_date: nextRunDate,
      due_days_after: dueDaysAfter ?? 7,
      line_items: lineItems ?? [],
      tax_rate: taxRate ?? 0,
      discount: discount ?? 0,
      discount_type: discountType ?? 'percentage',
      currency: currency ?? 'NGN',
      notes: notes || null,
      active: true,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
