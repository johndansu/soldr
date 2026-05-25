import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendContractSignedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const supabase = createClient()

  const { data: contract, error: findErr } = await supabase
    .from('contracts')
    .select('id, title, status, user_id, clients(name)')
    .eq('public_token', token)
    .single()

  if (findErr || !contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  if (contract.status === 'signed') {
    return NextResponse.json({ ok: true, alreadySigned: true })
  }

  const { error } = await supabase
    .from('contracts')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('public_token', token)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('business_email')
      .eq('user_id', contract.user_id)
      .single()

    if (settings?.business_email) {
      const clientRaw = contract.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'
      await sendContractSignedEmail({
        to: settings.business_email,
        clientName: client?.name ?? 'Your client',
        contractTitle: contract.title ?? 'Service Agreement',
        contractUrl: `${origin}/dashboard/contracts/${contract.id}`,
      })
    }
  } catch { /* silent */ }

  return NextResponse.json({ ok: true })
}
