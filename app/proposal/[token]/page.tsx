import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProposalMarkdown } from '@/components/proposal/ProposalMarkdown'
import { ProposalAcceptButton } from '@/components/proposal/ProposalAcceptButton'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_CONFIG = {
  accepted: { label: 'Accepted',   pill: 'bg-green-100 text-green-700',  banner: 'bg-green-50 border-green-100 text-green-800' },
  rejected: { label: 'Declined',   pill: 'bg-red-100 text-red-600',      banner: null },
  expired:  { label: 'Expired',    pill: 'bg-orange-100 text-orange-600', banner: null },
  sent:     { label: 'Sent',       pill: 'bg-blue-100 text-blue-600',    banner: null },
  draft:    { label: 'Draft',      pill: 'bg-gray-100 text-gray-500',    banner: null },
}

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, title, content, brief_input, status, created_at, public_token, user_id, clients(name, email)')
    .eq('public_token', params.token)
    .single()

  if (!proposal) return notFound()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name, business_email, business_phone')
    .eq('user_id', proposal.user_id)
    .single()

  const clientRaw = proposal.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  const status = (proposal.status ?? 'draft') as keyof typeof STATUS_CONFIG
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const canAccept = status === 'sent' || status === 'draft'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Accepted banner */}
        {status === 'accepted' && (
          <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${cfg.banner}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6.5"/><path d="M5 8l2 2.5 4-4"/>
            </svg>
            <div>
              <p className="text-sm font-semibold">Proposal accepted</p>
              <p className="text-xs opacity-80 mt-0.5">Thank you — {settings?.business_name ?? 'the team'} will be in touch shortly.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-7">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                {settings?.business_name && (
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {settings.business_name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-900 text-[15px]">{settings.business_name}</span>
                  </div>
                )}
                <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-snug">
                  {proposal.title ?? 'Proposal'}
                </h1>
                {client?.name && (
                  <p className="mt-1 text-sm text-gray-400">Prepared for {client.name}</p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-2">
                <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.pill}`}>
                  {cfg.label}
                </span>
                <p className="text-xs text-gray-400">{fmtDate(proposal.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-8" />

          {/* Proposal content */}
          <div className="px-8 py-8">
            <ProposalMarkdown content={proposal.content} />
          </div>

          {/* Accept section */}
          {canAccept && (
            <>
              <div className="h-px bg-gray-100 mx-8" />
              <div className="px-8 py-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Ready to move forward?</p>
                  <p className="text-xs text-gray-400 mt-0.5">Accepting confirms you agree to the terms above.</p>
                </div>
                <ProposalAcceptButton token={params.token} proposalId={proposal.id} />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Sent via <span className="font-medium text-gray-500">Soldr</span>
              {settings?.business_email && (
                <> · <a href={`mailto:${settings.business_email}`} className="hover:text-gray-700 transition-colors">{settings.business_email}</a></>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
