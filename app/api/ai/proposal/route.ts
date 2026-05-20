import { NextRequest } from 'next/server'
import { PROPOSAL_SYSTEM_PROMPT } from '@/lib/prompts/proposal'
import { createClient } from '@/lib/supabase/server'
import { getRawApiKey } from '@/middleware/withApiKey'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'

// Streaming only — saving is handled explicitly via POST /api/proposals

export async function POST(req: NextRequest) {
  const { prompt: brief } = await req.json()

  if (!brief) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  if (isOpenRouter) {
    return streamFromOpenRouter(brief)
  }

  // Anthropic BYOK path
  let userApiKey: string
  try {
    userApiKey = await getRawApiKey(user.id)
  } catch {
    return Response.json({ error: { code: 'NO_API_KEY' } }, { status: 422 })
  }

  return streamFromAnthropic(brief, userApiKey)
}

async function streamFromOpenRouter(brief: string) {
  for (const model of OPENROUTER_FREE_MODELS) {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
          { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
          { role: 'user', content: brief },
        ],
        stream: true,
      }),
    })

    if (!upstream.ok) {
      console.warn(`[proposal] ${model} → ${upstream.status}, trying next`)
      continue
    }

    console.log(`[proposal] streaming from ${model}`)

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const json = JSON.parse(data)
              const text = json.choices?.[0]?.delta?.content ?? ''
              if (text) {
                fullText += text
                controller.enqueue(new TextEncoder().encode(text))
              }
            } catch {}
          }
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  return Response.json({ error: { code: 'ALL_MODELS_BUSY' } }, { status: 503 })
}

async function streamFromAnthropic(brief: string, apiKey: string) {
  const { streamText } = await import('ai')
  const { getModel } = await import('@/lib/ai')

  const result = streamText({
    model: getModel(apiKey),
    system: PROPOSAL_SYSTEM_PROMPT,
    prompt: brief,
  })

  return result.toTextStreamResponse()
}
