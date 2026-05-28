import { NextRequest } from 'next/server'
import { DEBRIEF_SYSTEM_PROMPT } from '@/lib/prompts/debrief'
import { generateWriting } from '@/lib/ai-write'

export async function POST(req: NextRequest) {
  const { clientName, projectName, whatYouBuilt, outcomes, duration } = await req.json()
  if (!clientName || !whatYouBuilt) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const prompt = [
    `Client: ${clientName}`,
    projectName  ? `Project name: ${projectName}` : null,
    `What I built / delivered: ${whatYouBuilt}`,
    outcomes     ? `Results / outcomes: ${outcomes}` : null,
    duration     ? `Duration: ${duration}` : null,
  ].filter(Boolean).join('\n')

  try {
    const text = await generateWriting(prompt, DEBRIEF_SYSTEM_PROMPT)
    return Response.json({ content: text })
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number }
    if (e.code) return Response.json({ error: e.code }, { status: e.status ?? 500 })
    return Response.json({ error: 'GENERATE_ERROR' }, { status: 500 })
  }
}
