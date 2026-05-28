import { NextRequest } from 'next/server'
import { BIO_SYSTEM_PROMPT } from '@/lib/prompts/bio'
import { generateWriting } from '@/lib/ai-write'

export async function POST(req: NextRequest) {
  const { name, whatYouDo, specialties, experience, tone } = await req.json()
  if (!name || !whatYouDo) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const prompt = [
    `Name: ${name}`,
    `What I do: ${whatYouDo}`,
    specialties  ? `Specialties / industries: ${specialties}` : null,
    experience   ? `Experience / credentials: ${experience}` : null,
    tone         ? `Tone: ${tone}` : null,
  ].filter(Boolean).join('\n')

  try {
    const raw = await generateWriting(prompt, BIO_SYSTEM_PROMPT)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return Response.json(parsed)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number }
    if (e.code) return Response.json({ error: e.code }, { status: e.status ?? 500 })
    return Response.json({ error: 'PARSE_ERROR' }, { status: 500 })
  }
}
