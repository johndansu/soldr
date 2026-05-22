import { NewClientForm } from '@/components/clients/NewClientForm'

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Client</h1>
        <p className="mt-1 text-sm text-gray-500">Create a client record to link proposals and invoices.</p>
      </div>
      <div className="max-w-lg">
        <NewClientForm />
      </div>
    </div>
  )
}
