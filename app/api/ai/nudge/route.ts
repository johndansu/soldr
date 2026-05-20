import { NextRequest } from 'next/server'
import { NUDGE_SYSTEM_PROMPT } from '@/lib/prompts/nudge'
import { createClient } from '@/lib/supabase/server'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'
import { getRawApiKey } from '@/middleware/withApiKey'

interface NudgeEmail {
  tone: string
  subject: string
  body: string
}

function parseEmails(raw: string): NudgeEmail[] | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed?.emails) && parsed.emails.length === 3) return parsed.emails
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { context } = await req.json()
  if (!context) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

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
            { role: 'system', content: NUDGE_SYSTEM_PROMPT },
            { role: 'user', content: context },
          ],
        }),
      })
      if (!res.ok) { console.warn(`[nudge] ${model} → ${res.status}`); continue }
      const json = await res.json()
      const raw = json.choices?.[0]?.message?.content ?? ''
      const emails = parseEmails(raw)
      if (!emails) { console.warn(`[nudge] ${model} returned bad JSON`); continue }
      return Response.json({ emails })
    }
    return Response.json({ error: 'ALL_MODELS_BUSY' }, { status: 503 })
  }

  let apiKey: string
  try { apiKey = await getRawApiKey(user.id) } catch {
    return Response.json({ error: 'NO_API_KEY' }, { status: 422 })
  }

  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')
  const { text } = await generateText({ model: getModel(apiKey), system: NUDGE_SYSTEM_PROMPT, prompt: context })
  const emails = parseEmails(text)
  if (!emails) return Response.json({ error: 'PARSE_ERROR' }, { status: 500 })
  return Response.json({ emails })
}
