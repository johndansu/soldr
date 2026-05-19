import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { buildClient } from '@/lib/anthropic'
import type Anthropic from '@anthropic-ai/sdk'

export async function withApiKey(userId: string): Promise<Anthropic> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_settings')
    .select('encrypted_api_key, api_key_set')
    .eq('user_id', userId)
    .single()

  if (error || !data?.api_key_set) {
    throw new Error('NO_API_KEY')
  }

  const apiKey = decrypt(data.encrypted_api_key)
  return buildClient(apiKey)
}
