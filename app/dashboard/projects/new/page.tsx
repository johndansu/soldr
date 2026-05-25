import { createClient } from '@/lib/supabase/server'
import { PageContent } from '@/components/ui/PageContent'
import { NewProjectForm } from '@/components/projects/NewProjectForm'

export default async function NewProjectPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('user_id', user!.id).eq('status', 'active').order('name'),
    supabase.from('user_settings').select('default_currency').eq('user_id', user!.id).single(),
  ])

  return (
    <PageContent>
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">New project</h1>
          <p className="mt-0.5 text-sm text-gray-500">Group your proposals, invoices, and scope checks under one project.</p>
        </div>
        <NewProjectForm
          clients={clients ?? []}
          defaultCurrency={settings?.default_currency ?? 'NGN'}
        />
      </div>
    </PageContent>
  )
}
