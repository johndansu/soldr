import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getModel, isOpenRouter } from '@/lib/ai'
import { PROPOSAL_SYSTEM_PROMPT } from '@/lib/prompts/proposal'
import { createClient } from '@/lib/supabase/server'
import { getRawApiKey } from '@/middleware/withApiKey'

export async function POST(req: NextRequest) {
  const { prompt: brief, clientId, projectId } = await req.json()

  if (!brief) {
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let userApiKey: string | undefined

  if (!isOpenRouter) {
    try {
      userApiKey = await getRawApiKey(user.id)
    } catch {
      return Response.json({ error: { code: 'NO_API_KEY' } }, { status: 422 })
    }
  }

  const model = getModel(userApiKey)

  const result = streamText({
    model,
    system: PROPOSAL_SYSTEM_PROMPT,
    prompt: brief,
    onFinish: async ({ text }) => {
      try {
        await supabase.from('proposals').insert({
          user_id: user.id,
          client_id: clientId ?? null,
          project_id: projectId ?? null,
          brief_input: brief,
          content: text,
          prompt_version: 'v1',
        })
      } catch (e) {
        console.error('Failed to save proposal:', e)
      }
    },
  })

  return result.toTextStreamResponse()
}
