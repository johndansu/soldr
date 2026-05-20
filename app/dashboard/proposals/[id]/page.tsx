import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CopyButton } from '@/components/proposal/CopyButton'
import { ProposalMarkdown } from '@/components/proposal/ProposalMarkdown'

export default async function ProposalPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, clients(name)')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!proposal) notFound()

  const client = proposal.clients as { name: string } | null
  const date = new Date(proposal.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/proposals"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Proposals
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {proposal.title ?? 'Proposal'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {client?.name ? `${client.name} · ` : ''}{date}
          </p>
        </div>

        <CopyButton text={proposal.content} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProposalMarkdown content={proposal.content} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Original brief</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{proposal.brief_input}</p>
      </div>
    </div>
  )
}
