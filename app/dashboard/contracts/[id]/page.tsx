import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { SendButton } from '@/components/ui/SendButton'
import { ContractShareButton } from '@/components/contracts/ContractShareButton'
import { ContractStatusButton } from '@/components/contracts/ContractStatusButton'
import { ContractDocument } from '@/components/contracts/ContractDocument'
import { DownloadPDFButton } from '@/components/ui/DownloadPDFButton'
import { SaveAsTemplateButton } from '@/components/ui/SaveAsTemplateButton'

const STATUS_STEPS = [
  { key: 'draft',  label: 'Drafted' },
  { key: 'sent',   label: 'Sent' },
  { key: 'signed', label: 'Signed' },
]

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status)
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const isLast = i === STATUS_STEPS.length - 1
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                done ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'
              }`}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                )}
              </div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${done ? 'text-gray-700' : 'text-gray-300'}`}>
                {step.label}
              </p>
            </div>
            {!isLast && (
              <div className={`h-px w-16 mb-4 mx-1 transition-colors ${i < currentIdx ? 'bg-gray-900' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function ContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, clients(id, name, email), proposals(id, title), public_token')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!contract) notFound()

  const client = contract.clients as { id: string; name: string; email: string | null } | null
  const proposal = contract.proposals as { id: string; title: string | null } | null
  const date = new Date(contract.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PageContent>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/contracts" className="text-sm text-gray-400 hover:text-gray-700">← Contracts</Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
              {contract.title ?? 'Service Agreement'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {client?.name ? `${client.name} · ` : ''}{date}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <ContractStatusButton contractId={contract.id} initialStatus={contract.status ?? 'draft'} />
            {client?.email && (
              <SendButton
                endpoint={`/api/contracts/${contract.id}/send`}
                label="Send to client"
                successLabel="Sent!"
              />
            )}
            {contract.public_token && <ContractShareButton token={contract.public_token} />}
            <DownloadPDFButton
              endpoint={`/api/contracts/${contract.id}/pdf`}
              filename={`${(contract.title ?? 'contract').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`}
            />
            <SaveAsTemplateButton
              endpoint="/api/contract-templates"
              title={contract.title ?? 'Service Agreement'}
              content={contract.content}
            />
            <DeleteButton endpoint={`/api/contracts/${contract.id}`} redirectTo="/dashboard/contracts" />
          </div>
        </div>

        {/* Status timeline + signed info */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-5 flex items-center justify-between gap-6">
          <StatusTimeline status={contract.status ?? 'draft'} />
          {contract.status === 'signed' && contract.signed_at && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Signed</p>
              <p className="mt-0.5 text-sm font-medium text-green-700">
                {new Date(contract.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
          {!client?.email && contract.status === 'draft' && (
            <p className="text-xs text-amber-500 shrink-0">Add client email to send</p>
          )}
        </div>

        {/* Contract document */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <ContractDocument content={contract.content} />
        </div>

        {/* Linked proposal */}
        {proposal && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/><path d="M9 1v5h5"/>
              </svg>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">From proposal</p>
                <p className="text-sm font-medium text-gray-700">{proposal.title ?? 'Untitled proposal'}</p>
              </div>
            </div>
            <Link href={`/dashboard/proposals/${proposal.id}`} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
              View →
            </Link>
          </div>
        )}
      </div>
    </PageContent>
  )
}
