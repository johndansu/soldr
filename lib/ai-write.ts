import { createClient } from '@/lib/supabase/server'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'
import { getRawApiKey } from '@/middleware/withApiKey'

export async function generateWriting(prompt: string, systemPrompt: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw Object.assign(new Error('UNAUTHORIZED'), { code: 'UNAUTHORIZED', status: 401 })

  if (isOpenRouter) {
    for (const model of OPENROUTER_FREE_MODELS) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://soldr.app',
          'X-Title': 'Soldr',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!res.ok) { console.warn(`[write] ${model} → ${res.status}`); continue }
      const json = await res.json()
      const text = json.choices?.[0]?.message?.content ?? ''
      if (text) return text
    }
    throw Object.assign(new Error('ALL_MODELS_BUSY'), { code: 'ALL_MODELS_BUSY', status: 503 })
  }

  let apiKey: string
  try { apiKey = await getRawApiKey(user.id) } catch {
    throw Object.assign(new Error('NO_API_KEY'), { code: 'NO_API_KEY', status: 422 })
  }

  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')
  const { text } = await generateText({ model: getModel(apiKey), system: systemPrompt, prompt })
  return text
}
