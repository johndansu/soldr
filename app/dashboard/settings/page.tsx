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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your API key and account preferences.</p>
      </div>
      <div className="max-w-lg">
        <ApiKeyForm initialKeySet={settings?.api_key_set ?? false} />
      </div>
    </div>
  )
}
