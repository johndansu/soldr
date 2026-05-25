import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(id, name, email)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.name      !== undefined) update.name       = body.name?.trim() || null
  if (body.status    !== undefined) update.status      = body.status
  if (body.clientId  !== undefined) update.client_id   = body.clientId || null
  if (body.budget    !== undefined) update.budget      = body.budget ? Number(body.budget) : null
  if (body.currency  !== undefined) update.currency    = body.currency
  if (body.startDate !== undefined) update.start_date  = body.startDate || null
  if (body.endDate   !== undefined) update.end_date    = body.endDate || null
  if (body.notes     !== undefined) update.notes       = body.notes?.trim() || null

  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
