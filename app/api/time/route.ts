import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('time_entries')
    .select('id, date, hours, description, rate, currency, invoiced, invoice_id, client_id, clients(name)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const { clientId, date, hours, description, rate, currency } = body

  if (!date || !hours || hours <= 0) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id:     user.id,
      client_id:   clientId || null,
      date,
      hours:       parseFloat(hours),
      description: description?.trim() || null,
      rate:        parseFloat(rate) || 0,
      currency:    currency || 'NGN',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data, { status: 201 })
}
