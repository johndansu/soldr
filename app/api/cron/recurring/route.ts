import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function advanceDate(current: string, frequency: string): string {
  const d = new Date(current + 'T00:00:00')
  if (frequency === 'weekly')    d.setDate(d.getDate() + 7)
  if (frequency === 'monthly')   d.setMonth(d.getMonth() + 1)
  if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
  return d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all active templates due today or overdue
  const { data: templates, error } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('active', true)
    .lte('next_run_date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!templates?.length) return NextResponse.json({ generated: 0 })

  // Group templates by user_id to batch sequence updates
  const userSeqMap = new Map<string, number>()

  // Pre-fetch sequences for all affected users
  const userIds = [...new Set(templates.map((t) => t.user_id))]
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, invoice_sequence')
    .in('user_id', userIds)

  for (const s of settingsRows ?? []) {
    userSeqMap.set(s.user_id, s.invoice_sequence ?? 0)
  }

  let generated = 0
  const errors: string[] = []

  for (const template of templates) {
    try {
      const seq = (userSeqMap.get(template.user_id) ?? 0) + 1
      userSeqMap.set(template.user_id, seq)
      const invoiceNumber = `INV-${String(seq).padStart(3, '0')}`

      const dueDate = new Date(today)
      dueDate.setDate(dueDate.getDate() + (template.due_days_after ?? 7))
      const dueDateStr = dueDate.toISOString().split('T')[0]

      type LineItem = { description: string; qty: number; rate: number }
      const items = (template.line_items as LineItem[]) ?? []
      const subtotal = items.reduce((s: number, i: LineItem) => s + i.qty * i.rate, 0)
      const discountAmt = template.discount_type === 'percentage'
        ? subtotal * (template.discount ?? 0) / 100
        : (template.discount ?? 0)
      const afterDiscount = subtotal - discountAmt
      const total = afterDiscount + afterDiscount * (template.tax_rate ?? 0) / 100

      const { error: invErr } = await supabase
        .from('invoices')
        .insert({
          user_id:        template.user_id,
          client_id:      template.client_id,
          invoice_number: invoiceNumber,
          description:    template.name,
          amount:         total,
          currency:       template.currency,
          due_date:       dueDateStr,
          line_items:     template.line_items,
          tax_rate:       template.tax_rate,
          discount:       template.discount,
          discount_type:  template.discount_type,
          notes:          template.notes,
          template_id:    template.id,
          status:         'unpaid',
        })

      if (invErr) { errors.push(`${template.id}: ${invErr.message}`); continue }

      await supabase
        .from('invoice_templates')
        .update({ next_run_date: advanceDate(template.next_run_date, template.frequency) })
        .eq('id', template.id)

      generated++
    } catch (e) {
      errors.push(`${template.id}: ${String(e)}`)
    }
  }

  // Flush updated sequences
  for (const [userId, seq] of Array.from(userSeqMap.entries())) {
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, invoice_sequence: seq }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ generated, errors: errors.length ? errors : undefined })
}
