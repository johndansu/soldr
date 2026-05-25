import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { agreedScope, clientMessage, verdict, explanation, suggestedResponse } = await req.json()

  if (!agreedScope || !clientMessage || !verdict) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('scope_results')
    .insert({ user_id: user.id, agreed_scope: agreedScope, client_message: clientMessage, verdict, explanation, suggested_response: suggestedResponse })
    .select('id')
    .single()

  if (error) {
    console.error('[scope] save failed:', error)
    return Response.json({ error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ id: data.id })
}
