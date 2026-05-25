import { NewClientForm } from '@/components/clients/NewClientForm'
import { PageContent } from '@/components/ui/PageContent'

export default function NewClientPage() {
  return (
    <PageContent>
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Add Client</h1>
        <p className="mt-0.5 text-sm text-gray-500">Create a client record to link proposals and invoices.</p>
      </div>
      <div className="max-w-lg">
        <NewClientForm />
      </div>
    </div>
    </PageContent>
  )
}
