import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('client_notes')
    .insert({ user_id: user.id, client_id: params.id, content: content.trim() })
    .select('id, content, created_at')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { noteId } = await req.json()
  if (!noteId) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  await supabase.from('client_notes').delete().eq('id', noteId).eq('user_id', user.id)
  return Response.json({ ok: true })
}
