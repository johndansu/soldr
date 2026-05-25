import { createClient } from '@/lib/supabase/server'
import { ScopeDetector } from '@/components/scope/ScopeDetector'
import { PageContent } from '@/components/ui/PageContent'
import Link from 'next/link'

export default async function NewScopePage({
  searchParams,
}: {
  searchParams: { proposalId?: string }
}) {
  let initialAgreedScope = ''
  let proposalTitle: string | null = null
  let proposalId: string | null = null

  if (searchParams.proposalId) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id, title, content')
      .eq('id', searchParams.proposalId)
      .eq('user_id', user!.id)
      .single()

    if (proposal) {
      initialAgreedScope = proposal.content ?? ''
      proposalTitle = proposal.title
      proposalId = proposal.id
    }
  }

  return (
    <PageContent>
      {proposalId && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 shrink-0">
            <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/><path d="M9 1v5h5"/>
          </svg>
          <p className="text-sm text-indigo-700">
            Scope pre-filled from proposal: <span className="font-medium">{proposalTitle ?? 'Untitled'}</span>
          </p>
          <Link href={`/dashboard/proposals/${proposalId}`} className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors shrink-0">
            View proposal →
          </Link>
        </div>
      )}
      <ScopeDetector initialAgreedScope={initialAgreedScope} />
    </PageContent>
  )
}
