import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'

const VERDICT_META = {
  in_scope:            { label: 'In Scope',           color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  out_of_scope:        { label: 'Out of Scope',        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
  needs_clarification: { label: 'Needs Clarification', color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
}

export default async function ScopeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: check } = await supabase
    .from('scope_results')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!check) notFound()

  const meta = VERDICT_META[check.verdict as keyof typeof VERDICT_META] ?? { label: check.verdict, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
  const date = new Date(check.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PageContent>
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/scope" className="text-sm text-gray-400 hover:text-gray-700">← Scope Check</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Scope check</h1>
          <p className="mt-0.5 text-sm text-gray-400">{date}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Originally agreed</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{check.agreed_scope}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{"Client's request"}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{check.client_message}</p>
          </div>
        </div>

        <div className={`rounded-lg border ${meta.border} ${meta.bg} px-6 py-4`}>
          <p className={`text-base font-semibold tracking-tight ${meta.color}`}>{meta.label}</p>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{check.explanation}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Suggested reply</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{check.suggested_response}</p>
          </div>
        </div>
      </div>
    </PageContent>
  )
}
