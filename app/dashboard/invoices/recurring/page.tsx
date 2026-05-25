import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { RecurringToggle, GenerateNowButton, DeleteTemplateButton } from '@/components/invoices/RecurringActions'

const FREQ_BADGE: Record<string, string> = {
  weekly:    'bg-purple-50 text-purple-700',
  monthly:   'bg-blue-50 text-blue-700',
  quarterly: 'bg-teal-50 text-teal-700',
}

export default async function RecurringInvoicesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: templates } = await supabase
    .from('invoice_templates')
    .select('id, name, frequency, next_run_date, due_days_after, active, currency, clients(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const due = (templates ?? []).filter((t) => t.active && t.next_run_date <= today)

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/invoices" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Invoices</Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Recurring invoices</h1>
            <p className="mt-0.5 text-sm text-gray-400">{templates?.length ?? 0} template{(templates?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/dashboard/invoices/recurring/new"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            New template
          </Link>
        </div>

        {/* Due alert */}
        {due.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0">
                <circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11h.01"/>
              </svg>
              <p className="text-sm font-semibold text-amber-800">
                {due.length} template{due.length === 1 ? '' : 's'} ready to generate
                <span className="font-normal text-amber-600 ml-1.5">
                  — {due.map((t) => (t.clients as unknown as { name: string } | null)?.name ?? 'Unknown').join(', ')}
                </span>
              </p>
            </div>
            <p className="text-xs text-amber-600">Click Generate now on each →</p>
          </div>
        )}

        {!templates?.length ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500 font-medium">No recurring templates yet</p>
            <p className="mt-1 text-sm text-gray-400">Set up a template to auto-generate invoices for retainer clients.</p>
            <Link href="/dashboard/invoices/recurring/new"
              className="mt-4 inline-block rounded-xl bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              Create first template
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Template</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Frequency</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Next run</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Active</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest" aria-label="Actions" title="Actions" />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => {
                  const client = (t.clients as unknown as { name: string } | null)
                  const isDue = t.active && t.next_run_date <= today
                  const nextDate = new Date(t.next_run_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  const freqCls = FREQ_BADGE[t.frequency] ?? 'bg-gray-100 text-gray-500'
                  return (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 group transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Net {t.due_days_after} days</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${freqCls}`}>
                          {t.frequency}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className={`text-sm font-medium ${isDue ? 'text-amber-600' : 'text-gray-700'}`}>
                          {isDue ? '⚡ Due now' : nextDate}
                        </p>
                        {!isDue && <p className="text-xs text-gray-400 mt-0.5">{nextDate}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <RecurringToggle id={t.id} active={t.active} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {t.active && <GenerateNowButton id={t.id} />}
                          <DeleteTemplateButton id={t.id} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContent>
  )
}
