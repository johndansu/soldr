import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('expenses')
    .select('id, amount, currency, category, description, date, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { amount, currency, category, description, date } = await req.json()
  if (!amount || !date) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      amount: parseFloat(amount),
      currency: currency ?? 'NGN',
      category: category ?? 'other',
      description: description?.trim() || null,
      date,
    })
    .select('id, amount, currency, category, description, date, created_at')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data, { status: 201 })
}
