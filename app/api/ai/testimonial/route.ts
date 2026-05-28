import { NextRequest } from 'next/server'
import { TESTIMONIAL_SYSTEM_PROMPT } from '@/lib/prompts/testimonial'
import { generateWriting } from '@/lib/ai-write'

export async function POST(req: NextRequest) {
  const { clientName, projectDescription, platform } = await req.json()
  if (!clientName || !projectDescription) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const prompt = [
    `Client name: ${clientName}`,
    `Project: ${projectDescription}`,
    platform ? `Where to leave the review: ${platform}` : null,
  ].filter(Boolean).join('\n')

  try {
    const raw = await generateWriting(prompt, TESTIMONIAL_SYSTEM_PROMPT)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return Response.json(parsed)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number }
    if (e.code) return Response.json({ error: e.code }, { status: e.status ?? 500 })
    return Response.json({ error: 'PARSE_ERROR' }, { status: 500 })
  }
}
