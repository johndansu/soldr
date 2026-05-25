import { createClient } from '@/lib/supabase/server'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'
import { BusinessProfileForm } from '@/components/settings/BusinessProfileForm'
import { PageContent } from '@/components/ui/PageContent'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('api_key_set, business_name, business_email, business_address, business_phone, bank_details, default_tax_rate, default_currency, invoice_prefix, logo_url, email_signature, tax_aside_pct')
    .eq('user_id', user!.id)
    .single()

  return (
    <PageContent>
      <div className="space-y-8">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Settings</h1>

        <div className="max-w-lg rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">API Key</h2>
          <ApiKeyForm initialKeySet={settings?.api_key_set ?? false} />
        </div>

        <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Business Profile</h2>
          <p className="text-xs text-gray-400 mb-5">Printed on every invoice and client-facing document.</p>
          <BusinessProfileForm initial={{
            business_name:    settings?.business_name    ?? null,
            business_email:   settings?.business_email   ?? null,
            business_address: settings?.business_address ?? null,
            business_phone:   settings?.business_phone   ?? null,
            bank_details:     settings?.bank_details     ?? null,
            default_tax_rate: settings?.default_tax_rate ?? null,
            default_currency: settings?.default_currency ?? null,
            invoice_prefix:   settings?.invoice_prefix   ?? null,
            logo_url:         settings?.logo_url         ?? null,
            email_signature:  settings?.email_signature  ?? null,
            tax_aside_pct:    settings?.tax_aside_pct    ?? null,
          }} />
        </div>
      </div>
    </PageContent>
  )
}
