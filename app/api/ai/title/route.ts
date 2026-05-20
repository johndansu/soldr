import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'
import { getRawApiKey } from '@/middleware/withApiKey'

const SYSTEM = `Generate a short, professional proposal title (4-7 words) based on the project brief.
Return only the title — no quotes, no punctuation at the end, no explanation.
Examples: "E-Commerce Platform for Lagos Fashion Brand", "Salon Booking System Port Harcourt", "Logistics Tracking Dashboard for Last-Mile Delivery"`

export async function POST(req: NextRequest) {
  const { brief } = await req.json()
  if (!brief) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

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
            { role: 'system', content: SYSTEM },
            { role: 'user', content: brief },
          ],
          max_tokens: 30,
        }),
      })
      if (!res.ok) continue
      const json = await res.json()
      const title = json.choices?.[0]?.message?.content?.trim()
      if (title) return Response.json({ title })
    }
    return Response.json({ error: 'ALL_MODELS_BUSY' }, { status: 503 })
  }

  let apiKey: string
  try { apiKey = await getRawApiKey(user.id) } catch {
    return Response.json({ error: 'NO_API_KEY' }, { status: 422 })
  }

  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')
  const { text } = await generateText({ model: getModel(apiKey), system: SYSTEM, prompt: brief, maxOutputTokens: 30 })
  return Response.json({ title: text.trim() })
}
