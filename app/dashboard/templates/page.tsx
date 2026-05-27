import { createClient } from '@/lib/supabase/server'
import { PageContent } from '@/components/ui/PageContent'
import { TemplatesList } from '@/components/templates/TemplatesList'

export default async function TemplatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: proposalTemplates }, { data: contractTemplates }] = await Promise.all([
    supabase.from('proposal_templates').select('id, title, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('contract_templates').select('id, title, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }),
  ])

  return (
    <PageContent>
      <TemplatesList
        proposalTemplates={proposalTemplates ?? []}
        contractTemplates={contractTemplates ?? []}
      />
    </PageContent>
  )
}
