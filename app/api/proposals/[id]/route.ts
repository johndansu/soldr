import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { title, status } = await req.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const update: Record<string, string | null> = {}
  if (title !== undefined) update.title = title?.trim() || null
  if (status !== undefined) update.status = status

  const { error } = await supabase
    .from('proposals')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ ok: true })
}
