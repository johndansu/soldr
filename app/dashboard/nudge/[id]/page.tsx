import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { SendButton } from '@/components/ui/SendButton'

const TONE_META: Record<string, { label: string; desc: string }> = {
  friendly: { label: 'Friendly',     desc: 'Assume it slipped their mind.' },
  firm:     { label: 'Firm',         desc: 'Direct. Asks for a specific date.' },
  final:    { label: 'Final Notice', desc: 'Last message before action.' },
}

interface Email { tone: string; subject: string; body: string }

export default async function NudgeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: nudge } = await supabase
    .from('nudge_results')
    .select('*, clients(id, name, email)')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!nudge) notFound()

  const emails = nudge.emails as Email[]
  const date = new Date(nudge.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const clientRaw = nudge.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { id: string; name: string; email: string | null } | null

  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/nudge" className="text-sm text-gray-400 hover:text-gray-700">← Nudge</Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Follow-up emails</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {client && <span className="font-medium text-gray-600">{client.name} · </span>}
              {date}
            </p>
          </div>
          {client && (
            <Link
              href={`/dashboard/invoices/new?clientId=${client.id}`}
              className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Invoice {client.name}
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Context</p>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{nudge.context}</p>
        </div>

        <div className="space-y-3">
          {emails.map((email) => {
            const meta = TONE_META[email.tone] ?? { label: email.tone, desc: '' }
            return (
              <div key={email.tone} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{meta.label}</p>
                  {meta.desc && <p className="text-xs text-gray-400 mt-0.5">{meta.desc}</p>}
                </div>
                <div className="px-5 pb-5 pt-2 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-1">Subject</p>
                    <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-1">Body</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                  </div>
                  {client?.email && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-400">To: {client.email}</p>
                      <SendButton
                        endpoint={`/api/nudge/${nudge.id}/send`}
                        body={{ tone: email.tone }}
                        label="Send email"
                        successLabel="Sent!"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageContent>
  )
}
