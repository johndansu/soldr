import { createClient } from '@/lib/supabase/server'
import { NewInvoiceForm } from '@/components/invoices/NewInvoiceForm'

export default async function NewInvoicePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">Create an invoice and track payment.</p>
      </div>
      <div className="max-w-lg">
        <NewInvoiceForm clients={clients ?? []} />
      </div>
    </div>
  )
}
