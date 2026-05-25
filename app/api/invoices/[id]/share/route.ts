import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('public_token')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  let token = invoice.public_token
  if (!token) {
    token = randomUUID()
    const { error } = await supabase
      .from('invoices')
      .update({ public_token: token })
      .eq('id', params.id)
      .eq('user_id', user.id)
    if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  }

  return Response.json({ token, url: `/invoice/${token}` })
}
