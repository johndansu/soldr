# Claude API Reference
## Soldr — AI-Powered Freelance Operating System

**SDK:** `@anthropic-ai/sdk` (TypeScript)  
**Model family:** Claude 4.x  
**Pattern:** BYOK — user-supplied API key, decrypted server-side only

---

## 1. Installation

```bash
npm install @anthropic-ai/sdk
```

---

## 2. Current Model IDs

| Use case | Model ID | Notes |
|---|---|---|
| Proposal generation, all AI features | `claude-sonnet-4-6` | Best speed/intelligence balance. Replaces the dated `claude-sonnet-4-20250514` string in existing code |
| Optional: higher quality, slower | `claude-opus-4-7` | Most capable; adaptive thinking only |
| Optional: cheapest, fastest | `claude-haiku-4-5` | For simple tasks like classification |

> **Action required:** The architecture doc currently references `claude-sonnet-4-20250514` (deprecated, retires June 2026). Use the alias `claude-sonnet-4-6` in all new code.

---

## 3. Client Initialization (BYOK Pattern)

Every API route decrypts the user's key server-side. The Anthropic client is constructed per-request — never stored as a module-level singleton.

```typescript
// lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'

export function buildClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}
```

```typescript
// middleware/withApiKey.ts
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { buildClient } from '@/lib/anthropic'
import type Anthropic from '@anthropic-ai/sdk'

export async function withApiKey(userId: string): Promise<Anthropic> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_settings')
    .select('encrypted_api_key, api_key_set')
    .eq('user_id', userId)
    .single()

  if (error || !data?.api_key_set) {
    throw new Error('NO_API_KEY')
  }

  const apiKey = decrypt(data.encrypted_api_key) // AES-256-GCM
  return buildClient(apiKey)
}
```

---

## 4. Streaming — Proposal Drafter

The proposal endpoint streams token-by-token using Server-Sent Events. The Vercel AI SDK (`useCompletion`) consumes this on the client.

### API Route

```typescript
// app/api/ai/proposal/route.ts
import { NextRequest } from 'next/server'
import { withApiKey } from '@/middleware/withApiKey'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const { brief, userId, clientId, projectId } = await req.json()

  if (!brief || !userId) {
    return Response.json({ error: { code: 'BAD_REQUEST', status: 400 } }, { status: 400 })
  }

  let anthropic
  try {
    anthropic = await withApiKey(userId)
  } catch {
    return Response.json({ error: { code: 'NO_API_KEY', status: 422 } }, { status: 422 })
  }

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: PROPOSAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: brief }],
  })

  // Convert Anthropic SSE stream to a standard ReadableStream for the browser
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`
            )
          )
        }
      }

      // After streaming, save the full proposal to the DB
      const final = await stream.finalMessage()
      const content = final.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('')

      // TODO: save to proposals table, return proposal_id
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'done', proposalId: 'todo' })}\n\n`
        )
      )
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### Client (Vercel AI SDK)

```typescript
// components/proposal/ProposalDrafter.tsx
'use client'
import { useCompletion } from 'ai/react'

export function ProposalDrafter() {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/proposal',
  })

  async function handleDraft(brief: string) {
    await complete(brief)
  }

  return (
    <div>
      {/* brief input + button */}
      <pre>{completion}</pre>
    </div>
  )
}
```

---

## 5. Non-Streaming Endpoints

For endpoints that return JSON (clarify, scope, nudge, memory), use a standard `messages.create()` call. Always set a reasonable `max_tokens` ceiling.

```typescript
// app/api/ai/clarify/route.ts
import { NextRequest } from 'next/server'
import { withApiKey } from '@/middleware/withApiKey'

export async function POST(req: NextRequest) {
  const { brief, userId } = await req.json()
  const anthropic = await withApiKey(userId)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: CLARIFY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: brief }],
  })

  const text = response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // Parse the model's output into a JSON array of questions
  const questions = parseQuestionsFromText(text)

  return Response.json({ questions })
}
```

---

## 6. Embeddings for Client Memory (RAG)

> **Important:** Anthropic does not expose a public standalone embeddings API. The architecture doc references `text-embedding-3-small` (1536-dim) — that is an **OpenAI model**. Two good options:

### Option A — Voyage AI (recommended, Anthropic-affiliated)

Anthropic has invested in Voyage AI, whose models are purpose-built for RAG:

```bash
npm install voyageai
```

```typescript
// lib/embeddings.ts
import VoyageAI from 'voyageai'

const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY! })

export async function embed(text: string): Promise<number[]> {
  const result = await voyage.embed({
    input: text,
    model: 'voyage-3-lite', // 512-dim, cost-efficient
    // or 'voyage-3'        // 1024-dim, higher quality
  })
  return result.embeddings[0]
}
```

Adjust the `pgvector` column dimension in the schema:
- `voyage-3-lite` → `vector(512)`
- `voyage-3` → `vector(1024)`

### Option B — OpenAI `text-embedding-3-small` (matches current schema)

```bash
npm install openai
```

```typescript
// lib/embeddings.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function embed(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return result.data[0].embedding // 1536-dim — matches current schema
}
```

This option keeps the DB schema unchanged (`vector(1536)`). If using this, the `OPENAI_API_KEY` env var is required in addition to the user's Anthropic key.

### RAG Pipeline

```typescript
// app/api/ai/memory/route.ts
import { withApiKey } from '@/middleware/withApiKey'
import { embed } from '@/lib/embeddings'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { clientId, userId, context } = await req.json()
  const supabase = createClient()
  const anthropic = await withApiKey(userId)

  // 1. Embed the retrieval query
  const queryEmbedding = await embed(context ?? 'client overview')

  // 2. Cosine similarity search in pgvector
  const { data: notes } = await supabase.rpc('match_client_notes', {
    query_embedding: queryEmbedding,
    match_client_id: clientId,
    match_user_id: userId,
    match_count: 5,
  })

  // 3. Synthesise a pre-call summary with Claude
  const noteContext = notes?.map((n) => n.content).join('\n\n') ?? ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: MEMORY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Client notes:\n\n${noteContext}\n\nContext: ${context}`,
      },
    ],
  })

  const summary = response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')

  return Response.json({
    summary,
    sources: notes?.map((n) => ({ noteId: n.id })) ?? [],
  })
}

// When a note is saved — embed and store
export async function embedAndStore(
  noteId: string,
  content: string,
  clientId: string,
  userId: string
) {
  const supabase = createClient()
  const embedding = await embed(content)

  await supabase.from('embeddings').insert({
    note_id: noteId,
    client_id: clientId,
    user_id: userId,
    content,
    embedding,
  })

  await supabase
    .from('client_notes')
    .update({ embedded: true })
    .eq('id', noteId)
}
```

---

## 7. Prompt Caching

Cache the system prompt to reduce cost on repeated requests (up to 90% savings on cached tokens).

```typescript
// Cached system prompt — stays stable across requests
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: [
    {
      type: 'text',
      text: PROPOSAL_SYSTEM_PROMPT, // large, stable prompt
      cache_control: { type: 'ephemeral' }, // 5-minute TTL
    },
  ],
  messages: [{ role: 'user', content: brief }],
})
```

**Rules:**
- Do NOT interpolate timestamps, user IDs, or request-specific data into the system prompt — that busts the cache every time
- Inject per-request context as a `user` message, not the `system` prompt
- Minimum cacheable prefix is ~2048 tokens on Sonnet 4.6 — short prompts silently won't cache
- Verify hits via `response.usage.cache_read_input_tokens` (should be non-zero after the first request)

---

## 8. API Key Validation

When a user saves their Anthropic key, validate it with a minimal test call before encrypting and storing.

```typescript
// app/api/settings/api-key/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const { apiKey, userId } = await req.json()

  // Validate the key with the cheapest possible call
  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: { code: 'INVALID_API_KEY', status: 400 } },
        { status: 400 }
      )
    }
    throw e
  }

  // Encrypt and store
  const encryptedApiKey = encrypt(apiKey)
  const supabase = createClient()
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, encrypted_api_key: encryptedApiKey, api_key_set: true })

  return Response.json({ success: true, api_key_set: true })
}
```

---

## 9. Error Handling

Use typed SDK exception classes — never string-match error messages.

```typescript
import Anthropic from '@anthropic-ai/sdk'

try {
  const response = await anthropic.messages.create({ ... })
} catch (e) {
  if (e instanceof Anthropic.AuthenticationError) {
    // User's key is invalid or revoked
    return Response.json({ error: { code: 'INVALID_API_KEY', status: 401 } }, { status: 401 })
  }
  if (e instanceof Anthropic.RateLimitError) {
    // User has hit their own Anthropic rate limit
    return Response.json({ error: { code: 'RATE_LIMITED', status: 429 } }, { status: 429 })
  }
  if (e instanceof Anthropic.APIError) {
    return Response.json({ error: { code: 'AI_ERROR', status: 500 } }, { status: 500 })
  }
  throw e
}
```

---

## 10. Environment Variables

```bash
# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_SECRET=          # 32-byte AES-256-GCM key

# Embeddings (choose one)
VOYAGE_API_KEY=             # Option A: Voyage AI
OPENAI_API_KEY=             # Option B: OpenAI text-embedding-3-small

# Note: ANTHROPIC_API_KEY is NOT an env var on the server.
# Each user's key is stored encrypted in the DB and decrypted per-request.
```

---

## 11. System Prompt Files

Each AI feature has a dedicated, versioned prompt in `/lib/prompts/`. Keep prompts stable (no dynamic content) to maximise cache hit rate.

```
lib/prompts/
  proposal.ts     — proposal drafter
  clarify.ts      — brief clarifier (5 questions)
  memory.ts       — pre-call synthesis
  scope.ts        — scope creep detector
  nudge.ts        — payment nudge (3 tones)
```

Export a constant string from each file:

```typescript
// lib/prompts/proposal.ts
export const PROPOSAL_SYSTEM_PROMPT = `
You are an expert freelance proposal writer...
[rest of prompt — keep this stable across requests]
`.trim()
```

---

## 12. Stop Reason Handling

Always check `response.stop_reason` — particularly for agentic or long-output flows.

| `stop_reason` | Action |
|---|---|
| `end_turn` | Normal completion ✓ |
| `max_tokens` | Output was truncated — increase `max_tokens` or stream |
| `refusal` | Claude refused — surface a user-friendly message |

```typescript
if (response.stop_reason === 'max_tokens') {
  // Proposal was cut off — retry with higher max_tokens or warn user
}
```

---

## 13. Key Corrections to Existing Docs

| Location | Current | Should be |
|---|---|---|
| `02-TECHNICAL-ARCHITECTURE.md` line 119 | `model: 'claude-sonnet-4-20250514'` | `model: 'claude-sonnet-4-6'` |
| `02-TECHNICAL-ARCHITECTURE.md` §5.1 | "Anthropic's embedding model" | Voyage AI or OpenAI (see §6 above) |
| `03-DATABASE-SCHEMA.md` `vector(1536)` | Correct if using OpenAI; change to `vector(512)` or `vector(1024)` for Voyage AI |
