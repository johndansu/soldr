import { NextRequest } from 'next/server'
import { SCOPE_SYSTEM_PROMPT } from '@/lib/prompts/scope'
import { createClient } from '@/lib/supabase/server'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'
import { getRawApiKey } from '@/middleware/withApiKey'

interface ScopeResult {
  verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification'
  explanation: string
  suggested_response: string
}

function parseResult(raw: string): ScopeResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (parsed?.verdict && parsed?.explanation && parsed?.suggested_response) {
      return parsed as ScopeResult
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { agreedScope, clientMessage } = await req.json()
  if (!agreedScope || !clientMessage) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const prompt = `Original agreed scope:\n${agreedScope}\n\nNew client message:\n${clientMessage}`

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
            { role: 'system', content: SCOPE_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!res.ok) { console.warn(`[scope] ${model} → ${res.status}`); continue }
      const json = await res.json()
      const raw = json.choices?.[0]?.message?.content ?? ''
      const result = parseResult(raw)
      if (!result) { console.warn(`[scope] ${model} returned bad JSON`); continue }
      return Response.json(result)
    }
    return Response.json({ error: 'ALL_MODELS_BUSY' }, { status: 503 })
  }

  let apiKey: string
  try { apiKey = await getRawApiKey(user.id) } catch {
    return Response.json({ error: 'NO_API_KEY' }, { status: 422 })
  }

  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')
  const { text } = await generateText({ model: getModel(apiKey), system: SCOPE_SYSTEM_PROMPT, prompt })
  const result = parseResult(text)
  if (!result) return Response.json({ error: 'PARSE_ERROR' }, { status: 500 })
  return Response.json(result)
}
