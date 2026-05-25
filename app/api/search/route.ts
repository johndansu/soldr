import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  type: 'client' | 'proposal' | 'invoice' | 'project' | 'contract'
  id: string
  label: string
  sub: string
  href: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id
  const like = `%${q}%`

  const [
    { data: clients },
    { data: proposals },
    { data: invoices },
    { data: projects },
    { data: contracts },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, company, email').eq('user_id', uid).ilike('name', like).limit(5),
    supabase.from('proposals').select('id, title, status, clients(name)').eq('user_id', uid).ilike('title', like).limit(5),
    supabase.from('invoices').select('id, invoice_number, description, amount, currency, status, clients(name)').eq('user_id', uid).or(`invoice_number.ilike.${like},description.ilike.${like}`).limit(5),
    supabase.from('projects').select('id, name, status, clients(name)').eq('user_id', uid).ilike('name', like).limit(5),
    supabase.from('contracts').select('id, title, status, clients(name)').eq('user_id', uid).ilike('title', like).limit(5),
  ])

  const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }

  const results: SearchResult[] = [
    ...(clients ?? []).map((c) => ({
      type: 'client' as const,
      id: c.id,
      label: c.name,
      sub: c.company ?? c.email ?? 'Client',
      href: `/dashboard/clients/${c.id}`,
    })),
    ...(proposals ?? []).map((p) => {
      const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as { name: string } | null
      return {
        type: 'proposal' as const,
        id: p.id,
        label: p.title ?? 'Untitled proposal',
        sub: [client?.name, p.status].filter(Boolean).join(' · '),
        href: `/dashboard/proposals/${p.id}`,
      }
    }),
    ...(invoices ?? []).map((inv) => {
      const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as { name: string } | null
      const sym = SYMBOLS[inv.currency] ?? inv.currency
      return {
        type: 'invoice' as const,
        id: inv.id,
        label: inv.invoice_number ?? inv.description ?? 'Invoice',
        sub: [client?.name, `${sym}${inv.amount.toLocaleString('en')}`, inv.status].filter(Boolean).join(' · '),
        href: `/dashboard/invoices/${inv.id}`,
      }
    }),
    ...(projects ?? []).map((p) => {
      const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as { name: string } | null
      return {
        type: 'project' as const,
        id: p.id,
        label: p.name,
        sub: [client?.name, p.status].filter(Boolean).join(' · '),
        href: `/dashboard/projects/${p.id}`,
      }
    }),
    ...(contracts ?? []).map((c) => {
      const client = (Array.isArray(c.clients) ? c.clients[0] : c.clients) as { name: string } | null
      return {
        type: 'contract' as const,
        id: c.id,
        label: c.title ?? 'Service Agreement',
        sub: [client?.name, c.status].filter(Boolean).join(' · '),
        href: `/dashboard/contracts/${c.id}`,
      }
    }),
  ]

  return NextResponse.json(results)
}
