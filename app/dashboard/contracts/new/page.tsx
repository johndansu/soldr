import { createClient } from '@/lib/supabase/server'
import { PageContent } from '@/components/ui/PageContent'
import Link from 'next/link'
import { ContractGenerator } from '@/components/contracts/ContractGenerator'

interface Props {
  searchParams: { proposalId?: string }
}

export default async function NewContractPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name')
    .eq('user_id', user!.id)
    .single()

  let proposalContent = ''
  let clientId: string | undefined
  let clientName = ''
  let proposalId: string | undefined

  if (searchParams.proposalId) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id, content, clients(id, name)')
      .eq('id', searchParams.proposalId)
      .eq('user_id', user!.id)
      .single()

    if (proposal) {
      proposalId = proposal.id
      proposalContent = proposal.content ?? ''
      const clientRaw = proposal.clients
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { id: string; name: string } | null
      if (client) {
        clientId = client.id
        clientName = client.name
      }
    }
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/contracts" className="text-sm text-gray-400 hover:text-gray-700">← Contracts</Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">Generate contract</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {clientName ? `For ${clientName}` : 'AI-drafted service agreement'}
          </p>
        </div>

        <ContractGenerator
          proposalContent={proposalContent}
          proposalId={proposalId}
          clientId={clientId}
          clientName={clientName}
          freelancerName={settings?.business_name ?? ''}
        />
      </div>
    </PageContent>
  )
}
