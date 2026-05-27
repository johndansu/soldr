import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  await supabase.from('contract_templates').delete().eq('id', params.id).eq('user_id', user.id)
  return Response.json({ ok: true })
}

// Create a new contract from this template
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: template } = await supabase
    .from('contract_templates')
    .select('title, content')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!template) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      user_id:  user.id,
      title:    template.title,
      content:  template.content,
      status:   'draft',
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
