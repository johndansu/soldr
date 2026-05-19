# Technical Architecture Document
## Soldr — AI-Powered Freelance Operating System

**Version:** 1.0  
**Date:** May 2026  
**Stack:** Next.js · Supabase · Anthropic API · Vercel

---

## 1. System Overview

Soldr is a full-stack web application. The frontend and backend API routes are co-located in a single Next.js project deployed on Vercel. Supabase handles auth, relational data, and vector storage. All AI calls are made server-side using the user's own Anthropic API key (BYOK).

```
Browser (Next.js React)
        │
        ▼
Vercel Edge / API Routes (Next.js)
        │
        ├──── Supabase (Postgres + pgvector + Auth)
        │
        └──── Anthropic API (via user's BYOK key)
```

---

## 2. Frontend

### 2.1 Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand (global), React Query (server state / caching)
- **Forms:** React Hook Form + Zod validation
- **AI streaming:** Vercel AI SDK (`useChat`, `useCompletion`)

### 2.2 Key Pages & Components

| Route | Description |
|---|---|
| `/` | Landing page |
| `/app` | Main dashboard — recent proposals, client list |
| `/app/proposal/new` | Proposal drafter |
| `/app/clients/[id]` | Client detail — notes, history, memory retrieval |
| `/app/invoices` | Invoice tracker + nudge generator |
| `/settings` | API key management, subscription |

### 2.3 Streaming UI Pattern

All AI outputs stream token-by-token using the Vercel AI SDK. This means the user sees the proposal appearing in real time — no loading spinner waiting for a full response.

```typescript
// Example: streaming proposal generation
const { completion, complete, isLoading } = useCompletion({
  api: '/api/ai/proposal',
})

// Triggered when user clicks "Draft Proposal"
await complete(clientBrief)
```

---

## 3. Backend (Next.js API Routes)

### 3.1 Route Structure

```
/api
  /ai
    /proposal       POST — generate proposal from brief
    /clarify        POST — generate clarifying questions
    /memory         POST — retrieve client context (RAG)
    /scope          POST — detect scope creep
    /nudge          POST — generate payment follow-up email
  /clients
    /[id]           GET, PATCH, DELETE
    /[id]/notes     POST — save a note (also embeds into vector store)
  /invoices
    /[id]           GET, PATCH
  /webhooks
    /paystack       POST — handle payment events
```

### 3.2 BYOK Middleware

Every AI route passes through a middleware that:
1. Reads the user's encrypted API key from Supabase
2. Decrypts it server-side
3. Injects it into the Anthropic client for that request
4. Key is never logged, never returned to the client

```typescript
// middleware/withApiKey.ts
export async function withApiKey(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_settings')
    .select('encrypted_api_key')
    .eq('user_id', userId)
    .single()

  return decrypt(data.encrypted_api_key) // AES-256-GCM
}
```

### 3.3 AI Request Pattern

All AI routes follow this pattern:

```typescript
// /api/ai/proposal/route.ts
export async function POST(req: Request) {
  const { brief, userId } = await req.json()
  const apiKey = await withApiKey(userId)

  const anthropic = new Anthropic({ apiKey })

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: PROPOSAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: brief }],
  })

  return stream.toReadableStream() // streams to client
}
```

---

## 4. Database (Supabase / Postgres)

See `03-DATABASE-SCHEMA.md` for full schema. Summary:

- `users` — managed by Supabase Auth
- `user_settings` — BYOK key (encrypted), preferences
- `clients` — client profiles
- `projects` — projects per client
- `proposals` — generated proposals, linked to project
- `invoices` — invoice tracking
- `client_notes` — free-form notes per client
- `embeddings` — vector store for client memory (pgvector)

---

## 5. AI / RAG Architecture

### 5.1 Client Memory Pipeline

When a user saves a note about a client, the system:
1. Sends the note text to Anthropic's embedding model
2. Stores the embedding vector in the `embeddings` table (pgvector)
3. Associates the vector with `client_id` and `user_id`

When the user triggers "Catch me up on [Client]":
1. A query embedding is generated from a generic retrieval prompt
2. A cosine similarity search runs against `embeddings` filtered by `client_id`
3. Top 5 most relevant notes are retrieved
4. These are passed as context to Claude, which synthesises a pre-call summary

```
User note → embed() → pgvector store
                              │
"Catch me up" → embed(query) → similarity search → top-5 chunks
                                                        │
                                              Claude → summary
```

### 5.2 System Prompts

Each feature has a dedicated, versioned system prompt stored in `/lib/prompts/`:

```
/lib/prompts
  proposal.ts       — proposal drafter system prompt
  clarify.ts        — brief clarifier system prompt
  memory.ts         — pre-call memory synthesis prompt
  scope.ts          — scope creep detector prompt
  nudge.ts          — payment nudge email prompts (3 tones)
```

Prompts are versioned via a `prompt_version` field so regressions can be tracked.

---

## 6. Auth

- Supabase Auth (email + password, magic link)
- Session handled via Supabase SSR helpers in Next.js middleware
- All API routes validate session before processing
- Row Level Security (RLS) on all Supabase tables — users can only access their own data

---

## 7. Payments

- **Provider:** Paystack (supports Naira, USD, card, bank transfer)
- **Flow:** User selects Pro plan → redirected to Paystack hosted page → webhook confirms payment → `subscription_status` updated in Supabase
- **Webhook route:** `/api/webhooks/paystack` — verifies Paystack signature before processing

---

## 8. Deployment

| Service | Provider | Cost |
|---|---|---|
| Frontend + API | Vercel (Hobby) | Free |
| Database + Auth | Supabase (Free tier) | Free |
| Vector store | Supabase pgvector | Free (included) |
| Email (nudges) | Resend (Free tier, 3k/mo) | Free |
| Domain | Namecheap / Vercel | ~$10/yr |

**Total monthly infrastructure cost: $0 until ~500 users**

---

## 9. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_SECRET=           # 32-byte secret for AES-256-GCM

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=

# Resend (email)
RESEND_API_KEY=
```

Note: The Anthropic API key is NOT an environment variable — it comes from the user's own account via BYOK and is stored encrypted in the database per user.

---

## 10. Security Considerations

| Concern | Mitigation |
|---|---|
| API key exposure | Encrypted at rest (AES-256-GCM), decrypted only in server-side route handlers, never sent to client |
| Unauthorised data access | Supabase RLS enforced on all tables |
| Prompt injection | Input sanitised before inclusion in prompts; system prompt instructs model to ignore override attempts |
| Webhook spoofing | Paystack webhook signature verified on every event |
| Brute force | Supabase Auth rate limiting enabled |
