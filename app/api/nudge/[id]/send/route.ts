import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendNudgeEmail } from '@/lib/email'

interface Email { tone: string; subject: string; body: string }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tone } = await req.json()  // which tone variant to send

  const { data: nudge } = await supabase
    .from('nudge_results')
    .select('emails, clients(name, email)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!nudge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client = (Array.isArray(nudge.clients) ? nudge.clients[0] : nudge.clients) as { name: string; email: string | null } | null

  if (!client?.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })

  const emails = nudge.emails as Email[]
  const email = emails.find((e) => e.tone === tone) ?? emails[0]
  if (!email) return NextResponse.json({ error: 'No email found for that tone' }, { status: 400 })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name')
    .eq('user_id', user.id)
    .single()

  try {
    await sendNudgeEmail({
      to: client.email,
      subject: email.subject,
      body: email.body,
      fromName: settings?.business_name ?? 'Your supplier',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
