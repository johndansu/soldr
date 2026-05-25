import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendContractEmail } from '@/lib/email'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, status, public_token, clients(name, email)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clientRaw = contract.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  if (!client?.email) return NextResponse.json({ error: 'Client has no email' }, { status: 422 })
  if (!contract.public_token) return NextResponse.json({ error: 'No public token' }, { status: 422 })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name')
    .eq('user_id', user.id)
    .single()

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'

  await sendContractEmail({
    to: client.email,
    clientName: client.name,
    businessName: settings?.business_name ?? 'Your freelancer',
    contractTitle: contract.title ?? 'Service Agreement',
    publicUrl: `${origin}/contract/${contract.public_token}`,
  })

  if (contract.status === 'draft') {
    await supabase
      .from('contracts')
      .update({ status: 'sent' })
      .eq('id', params.id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
