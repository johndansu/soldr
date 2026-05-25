import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { context, emails, clientId } = await req.json()

  if (!context || !emails) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('nudge_results')
    .insert({ user_id: user.id, context, emails, client_id: clientId || null })
    .select('id')
    .single()

  if (error) {
    console.error('[nudge] save failed:', error)
    return Response.json({ error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ id: data.id })
}
