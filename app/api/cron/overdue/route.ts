import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOverdueReminderEmail } from '@/lib/email'

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }
function fmt(amount: number, currency: string) {
  const s = SYMBOLS[currency] ?? currency + ' '
  return `${s}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function daysDiff(dateStr: string): number {
  const due = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}
function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all overdue unpaid invoices that have a client email and haven't had 3 reminders yet
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, public_token, reminders_sent, last_reminder_at, user_id, clients(name, email)')
    .eq('status', 'unpaid')
    .lt('due_date', today)
    .lt('reminders_sent', 3)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoices?.length) return NextResponse.json({ sent: 0 })

  // Fetch business names for all affected users in one query
  const userIds = [...new Set(invoices.map((i) => i.user_id))]
  const { data: settingsRows } = await supabase
    .from('user_settings')
    .select('user_id, business_name')
    .in('user_id', userIds)

  const businessMap = new Map<string, string>()
  for (const s of settingsRows ?? []) {
    businessMap.set(s.user_id, s.business_name ?? 'Your supplier')
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://soldr.app'
  let sent = 0
  const errors: string[] = []

  for (const inv of invoices) {
    try {
      const clientRaw = inv.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null
      if (!client?.email) continue

      const daysOverdue = daysDiff(inv.due_date)
      const remindersSent = inv.reminders_sent ?? 0
      const lastSentDaysAgo = inv.last_reminder_at ? daysSince(inv.last_reminder_at) : null

      // Reminder schedule:
      // #1 — send on day 1+ overdue, never sent before
      // #2 — send 6+ days after reminder #1 (approx day 7)
      // #3 — send 7+ days after reminder #2 (approx day 14)
      const shouldSend =
        (remindersSent === 0 && daysOverdue >= 1) ||
        (remindersSent === 1 && lastSentDaysAgo !== null && lastSentDaysAgo >= 6) ||
        (remindersSent === 2 && lastSentDaysAgo !== null && lastSentDaysAgo >= 7)

      if (!shouldSend) continue

      // Ensure public token exists
      let token = inv.public_token
      if (!token) {
        token = crypto.randomUUID()
        await supabase.from('invoices').update({ public_token: token }).eq('id', inv.id)
      }

      await sendOverdueReminderEmail({
        to: client.email,
        clientName: client.name,
        businessName: businessMap.get(inv.user_id) ?? 'Your supplier',
        invoiceNumber: inv.invoice_number ?? 'Invoice',
        amount: fmt(Number(inv.amount), inv.currency),
        dueDate: fmtDate(inv.due_date),
        daysOverdue,
        publicUrl: `${origin}/invoice/${token}`,
      })

      await supabase
        .from('invoices')
        .update({ reminders_sent: remindersSent + 1, last_reminder_at: new Date().toISOString() })
        .eq('id', inv.id)

      sent++
    } catch (e) {
      errors.push(`${inv.id}: ${String(e)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
}
