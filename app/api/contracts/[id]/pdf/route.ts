import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { ContractPDF } from '@/lib/pdf/ContractPDF'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: contract }, { data: settings }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, title, content, status, signed_at, clients(name), user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_settings')
      .select('business_name')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clientRaw = contract.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null

  const buffer = await renderToBuffer(
    createElement(ContractPDF, {
      title: contract.title ?? 'Service Agreement',
      content: contract.content,
      status: contract.status,
      signed_at: contract.signed_at,
      freelancerName: settings?.business_name ?? null,
      clientName: client?.name ?? null,
    })
  )

  const slug = (contract.title ?? 'contract').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${slug}.pdf"`,
    },
  })
}
