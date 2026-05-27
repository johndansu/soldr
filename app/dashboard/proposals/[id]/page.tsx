import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CopyButton } from '@/components/proposal/CopyButton'
import { ProposalMarkdown } from '@/components/proposal/ProposalMarkdown'
import { ProposalShareButton } from '@/components/proposal/ProposalShareButton'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { SendButton } from '@/components/ui/SendButton'
import { SaveAsTemplateButton } from '@/components/ui/SaveAsTemplateButton'
import { ProposalStatusButton } from '@/components/proposals/ProposalStatusButton'

export default async function ProposalPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, clients(id, name, email), public_token')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!proposal) notFound()

  const client = proposal.clients as { id: string; name: string; email: string | null } | null
  const date = new Date(proposal.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <PageContent>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/proposals" className="text-sm text-gray-400 hover:text-gray-700">
            ← Proposals
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
            {proposal.title ?? 'Proposal'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {client?.name ? `${client.name} · ` : ''}{date}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveAsTemplateButton
            endpoint="/api/proposal-templates"
            title={proposal.title ?? 'Proposal'}
            content={proposal.content}
          />
          <ProposalStatusButton proposalId={proposal.id} initialStatus={proposal.status ?? 'draft'} />
          {client?.email && (
            <SendButton
              endpoint={`/api/proposals/${proposal.id}/send`}
              label="Send to client"
              successLabel="Sent!"
            />
          )}
          {proposal.public_token && <ProposalShareButton token={proposal.public_token} />}
          <CopyButton text={proposal.content} />
          <Link
            href={`/dashboard/scope/new?proposalId=${proposal.id}`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/><path d="M5.5 7l1.5 1.5 2.5-2.5"/>
            </svg>
            Scope Check
          </Link>
          {proposal.status === 'accepted' && (
            <Link
              href={`/dashboard/contracts/new?proposalId=${proposal.id}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/>
                <path d="M9 1v5h5"/><path d="M5 10h6M5 12.5h3"/><path d="M5 7.5l1 1 2-2"/>
              </svg>
              Generate contract
            </Link>
          )}
          <Link
            href={`/dashboard/invoices/new?proposalId=${proposal.id}`}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Invoice this
          </Link>
          <DeleteButton endpoint={`/api/proposals/${proposal.id}`} redirectTo="/dashboard/proposals" />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-8">
        <ProposalMarkdown content={proposal.content} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Original brief</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{proposal.brief_input}</p>
      </div>
    </div>
    </PageContent>
  )
}
