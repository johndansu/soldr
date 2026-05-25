import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendProposalAcceptedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // Use server client — the public read policy allows this lookup
  const supabase = createClient()

  // Find the proposal by token
  const { data: proposal, error: findErr } = await supabase
    .from('proposals')
    .select('id, title, status, user_id, clients(name)')
    .eq('public_token', token)
    .single()

  if (findErr || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  if (proposal.status === 'accepted') {
    return NextResponse.json({ ok: true, alreadyAccepted: true })
  }

  const { error } = await supabase
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('public_token', token)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the freelancer — best-effort, don't fail the request if email fails
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('business_email')
      .eq('user_id', proposal.user_id)
      .single()

    if (settings?.business_email) {
      const clientRaw = proposal.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'
      await sendProposalAcceptedEmail({
        to: settings.business_email,
        clientName: client?.name ?? 'Your client',
        proposalTitle: proposal.title ?? 'Proposal',
        proposalUrl: `${origin}/dashboard/proposals/${proposal.id}`,
      })
    }
  } catch { /* silent */ }

  return NextResponse.json({ ok: true })
}
