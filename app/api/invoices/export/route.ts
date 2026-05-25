import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('invoice_number, description, amount, currency, due_date, status, created_at, clients(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (invoices ?? []).map((inv) => {
    const clientRaw = inv.clients
    const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string } | null
    return [
      inv.invoice_number ?? '',
      client?.name ?? '',
      inv.description ?? '',
      inv.currency,
      inv.amount.toFixed(2),
      inv.due_date,
      inv.status,
      new Date(inv.created_at).toISOString().split('T')[0],
    ]
  })

  const header = ['Invoice #', 'Client', 'Description', 'Currency', 'Amount', 'Due Date', 'Status', 'Created']
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
