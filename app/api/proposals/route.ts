import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { title, content, briefInput } = await req.json()

  if (!content) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      user_id: user.id,
      title: title?.trim() || null,
      brief_input: briefInput ?? '',
      content,
      prompt_version: 'v1',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[proposals] save failed:', error)
    return Response.json({ error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ id: data.id })
}
