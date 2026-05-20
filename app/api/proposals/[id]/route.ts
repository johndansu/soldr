import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { title } = await req.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { error } = await supabase
    .from('proposals')
    .update({ title: title?.trim() || null })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ ok: true })
}
