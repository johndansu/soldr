import { NextRequest } from 'next/server'
import { CLARIFY_SYSTEM_PROMPT } from '@/lib/prompts/clarify'
import { createClient } from '@/lib/supabase/server'
import { getRawApiKey } from '@/middleware/withApiKey'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { brief } = await req.json()

  if (!brief) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  if (isOpenRouter) {
    return clarifyFromOpenRouter(brief)
  }

  let userApiKey: string
  try {
    userApiKey = await getRawApiKey(user.id)
  } catch {
    return Response.json({ error: { code: 'NO_API_KEY' } }, { status: 422 })
  }

  return clarifyFromAnthropic(brief, userApiKey)
}

async function clarifyFromOpenRouter(brief: string) {
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
          { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
          { role: 'user', content: brief },
        ],
      }),
    })

    if (!res.ok) {
      console.warn(`[clarify] ${model} → ${res.status}, trying next`)
      continue
    }

    const json = await res.json()
    const raw = json.choices?.[0]?.message?.content ?? ''

    const questions = parseQuestions(raw)
    if (!questions) {
      console.warn(`[clarify] ${model} returned unparseable JSON, trying next`)
      continue
    }

    console.log(`[clarify] success from ${model}`)
    return Response.json({ questions })
  }

  return Response.json({ error: { code: 'ALL_MODELS_BUSY' } }, { status: 503 })
}

async function clarifyFromAnthropic(brief: string, apiKey: string) {
  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')

  const { text } = await generateText({
    model: getModel(apiKey),
    system: CLARIFY_SYSTEM_PROMPT,
    prompt: brief,
  })

  const questions = parseQuestions(text)
  if (!questions) {
    return Response.json({ error: { code: 'PARSE_ERROR' } }, { status: 500 })
  }

  return Response.json({ questions })
}

function parseQuestions(raw: string): string[] | null {
  try {
    // Strip markdown code fences if model wrapped the JSON
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length === 5 && parsed.every(q => typeof q === 'string')) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
