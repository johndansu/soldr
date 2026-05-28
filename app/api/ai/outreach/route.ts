import { NextRequest } from 'next/server'
import { OUTREACH_SYSTEM_PROMPT } from '@/lib/prompts/outreach'
import { generateWriting } from '@/lib/ai-write'

export async function POST(req: NextRequest) {
  const { leadName, company, whatYouDo, whyReaching, credential } = await req.json()
  if (!leadName || !whatYouDo || !whyReaching) {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const prompt = [
    `Lead name: ${leadName}`,
    company       ? `Company: ${company}` : null,
    `What I do: ${whatYouDo}`,
    `Why I'm reaching out: ${whyReaching}`,
    credential    ? `Credential / result to include: ${credential}` : null,
  ].filter(Boolean).join('\n')

  try {
    const raw = await generateWriting(prompt, OUTREACH_SYSTEM_PROMPT)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    return Response.json(parsed)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number }
    if (e.code) return Response.json({ error: e.code }, { status: e.status ?? 500 })
    return Response.json({ error: 'PARSE_ERROR' }, { status: 500 })
  }
}
