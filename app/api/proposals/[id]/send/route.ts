import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendProposalEmail } from '@/lib/email'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, title, public_token, clients(name, email)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client = (Array.isArray(proposal.clients) ? proposal.clients[0] : proposal.clients) as { name: string; email: string | null } | null

  if (!client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name')
    .eq('user_id', user.id)
    .single()

  // Update status to 'sent' when sending
  await supabase
    .from('proposals')
    .update({ status: 'sent' })
    .eq('id', proposal.id)
    .eq('status', 'draft')   // only auto-advance from draft

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'

  try {
    await sendProposalEmail({
      to: client.email,
      clientName: client.name,
      businessName: settings?.business_name ?? 'Your supplier',
      proposalTitle: proposal.title ?? 'Proposal',
      publicUrl: `${origin}/proposal/${proposal.public_token}`,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
