import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data } = await supabase
    .from('user_settings')
    .select('api_key_set')
    .eq('user_id', user.id)
    .single()

  return Response.json({ api_key_set: data?.api_key_set ?? false })
}

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json()
  if (!apiKey?.trim()) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  // Basic key format check
  if (!apiKey.trim().startsWith('sk-ant-')) {
    return Response.json({ error: 'INVALID_KEY_FORMAT' }, { status: 422 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const encrypted = encrypt(apiKey.trim())

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, encrypted_api_key: encrypted, api_key_set: true },
      { onConflict: 'user_id' }
    )

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, encrypted_api_key: null, api_key_set: false },
      { onConflict: 'user_id' }
    )

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ ok: true })
}
