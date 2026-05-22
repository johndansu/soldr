import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, currency, due_date, status, description, created_at, clients(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const { clientId, amount, currency, dueDate, description } = await req.json()
  if (!clientId || !amount || !dueDate) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      client_id: clientId,
      amount: parseFloat(amount),
      currency: currency || 'NGN',
      due_date: dueDate,
      description: description?.trim() || null,
      status: 'unpaid',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
