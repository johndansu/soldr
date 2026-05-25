import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')

  if (type === 'proposals') {
    const { data } = await supabase
      .from('proposals')
      .select('id, title')
      .eq('user_id', user.id)
      .is('project_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json((data ?? []).map((p) => ({ id: p.id, label: p.title ?? 'Untitled' })))
  }

  if (type === 'invoices') {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, description, clients(name)')
      .eq('user_id', user.id)
      .is('project_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json((data ?? []).map((inv) => {
      const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
      const label = [inv.invoice_number, client?.name, inv.description].filter(Boolean).join(' · ')
      return { id: inv.id, label: label || 'Invoice' }
    }))
  }

  return NextResponse.json([])
}
