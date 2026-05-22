import { NextRequest } from 'next/server'
import { MEMORY_SYSTEM_PROMPT } from '@/lib/prompts/memory'
import { createClient } from '@/lib/supabase/server'
import { isOpenRouter, OPENROUTER_FREE_MODELS } from '@/lib/ai'
import { getRawApiKey } from '@/middleware/withApiKey'

export async function POST(req: NextRequest) {
  const { clientId } = await req.json()
  if (!clientId) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: notes } = await supabase
    .from('client_notes')
    .select('content, created_at')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (!notes?.length) {
    return Response.json({ error: 'NO_NOTES' }, { status: 422 })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name, company')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .single()

  const notesText = notes
    .map((n) => `[${new Date(n.created_at).toLocaleDateString('en-GB')}] ${n.content}`)
    .join('\n\n')

  const prompt = `Client: ${client?.name ?? 'Unknown'}${client?.company ? ` (${client.company})` : ''}\n\nNotes:\n${notesText}`

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
            { role: 'system', content: MEMORY_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!res.ok) continue
      const json = await res.json()
      const summary = json.choices?.[0]?.message?.content?.trim()
      if (summary) return Response.json({ summary })
    }
    return Response.json({ error: 'ALL_MODELS_BUSY' }, { status: 503 })
  }

  let apiKey: string
  try { apiKey = await getRawApiKey(user.id) } catch {
    return Response.json({ error: 'NO_API_KEY' }, { status: 422 })
  }

  const { generateText } = await import('ai')
  const { getModel } = await import('@/lib/ai')
  const { text } = await generateText({ model: getModel(apiKey), system: MEMORY_SYSTEM_PROMPT, prompt })
  return Response.json({ summary: text.trim() })
}
