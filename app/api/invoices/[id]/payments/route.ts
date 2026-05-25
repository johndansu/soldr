import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoice_payments')
    .select('id, amount, paid_date, notes, created_at')
    .eq('invoice_id', params.id)
    .eq('user_id', user.id)
    .order('paid_date', { ascending: true })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { amount, paidDate, notes } = await req.json()
  if (!amount || !paidDate) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  // Verify invoice belongs to user
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const { data, error } = await supabase
    .from('invoice_payments')
    .insert({ invoice_id: params.id, user_id: user.id, amount, paid_date: paidDate, notes: notes || null })
    .select('id, amount, paid_date, notes, created_at')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { paymentId } = await req.json()
  if (!paymentId) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const { error } = await supabase
    .from('invoice_payments')
    .delete()
    .eq('id', paymentId)
    .eq('invoice_id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ ok: true })
}
