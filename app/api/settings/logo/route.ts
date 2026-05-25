import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  if (!['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
  }

  const path = `logos/${user.id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('business-assets')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('business-assets')
    .getPublicUrl(path)

  // Save URL to user_settings
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, logo_url: publicUrl }, { onConflict: 'user_id' })

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find and remove any existing logo
  const { data: files } = await supabase.storage
    .from('business-assets')
    .list('logos', { search: user.id })

  if (files?.length) {
    await supabase.storage
      .from('business-assets')
      .remove(files.map((f) => `logos/${f.name}`))
  }

  await supabase
    .from('user_settings')
    .update({ logo_url: null })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
