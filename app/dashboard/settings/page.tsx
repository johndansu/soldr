import { createClient } from '@/lib/supabase/server'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('api_key_set')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      <div className="max-w-lg rounded-lg border border-gray-200 bg-white p-6">
        <ApiKeyForm initialKeySet={settings?.api_key_set ?? false} />
      </div>
    </div>
  )
}
