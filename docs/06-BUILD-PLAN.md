# Build Plan
## Soldr — AI-Powered Freelance Operating System

---

## Foundation (Before Any Phase)

These are hard dependencies that every feature sits on. Build in this exact order.

**Step 0 — Scaffold**
- `npx create-next-app@14 soldr --typescript --tailwind --app`
- Install: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `ai` (Vercel AI SDK)

**Step 1 — Supabase + Auth**
- Create Supabase project, enable pgvector + uuid-ossp
- Run DB migrations from `03-DATABASE-SCHEMA.md` in order: `user_settings` → `clients` → `projects` → `proposals` → `invoices` → `client_notes` → `embeddings` → `match_client_notes` function → triggers
- Wire Supabase Auth (email+password, magic link) with SSR client (`lib/supabase/server.ts`, `lib/supabase/client.ts`)
- Auth middleware (`middleware.ts`) — redirect unauthenticated users to `/login`

**Step 2 — Core Utilities**
- `lib/crypto.ts` — AES-256-GCM `encrypt` / `decrypt` (Node `crypto` module)
- `lib/anthropic.ts` — `buildClient(apiKey)` factory
- `middleware/withApiKey.ts` — decrypt key from DB, return Anthropic client
- `lib/prompts/` directory — stub files for all 5 prompts (proposal, clarify, memory, scope, nudge)

**Step 3 — Layout + Auth UI**
- `/app/login/page.tsx` — sign in / sign up form
- `/app/(dashboard)/layout.tsx` — sidebar, nav, auth guard
- `/app/(dashboard)/page.tsx` — empty dashboard home

At this point: auth works, DB is seeded, utilities are in place. Nothing AI yet.

---

## Phase 1 — MVP

Goal: a freelancer can paste a brief and get a real proposal. Ship this first.

### F-01: Proposal Drafter

Build order:
1. `lib/prompts/proposal.ts` — write the actual system prompt
2. `app/api/ai/proposal/route.ts` — streaming SSE route (edge runtime, `messages.stream`, ReadableStream)
3. `components/proposal/ProposalDrafter.tsx` — `useCompletion` from Vercel AI SDK, brief textarea, stream display
4. Save completed proposal to `proposals` table after stream closes (replace the `TODO` in the route)
5. `app/(dashboard)/proposals/new/page.tsx` — wraps the drafter
6. `app/(dashboard)/proposals/page.tsx` — list view (title, client, date, status)
7. `app/(dashboard)/proposals/[id]/page.tsx` — read-only markdown render

Validation gate: paste a real brief, see it stream token-by-token, check Supabase that the row was saved.

### F-02: Brief Clarifier

Build order:
1. `lib/prompts/clarify.ts` — system prompt (returns exactly 5 questions)
2. `app/api/ai/clarify/route.ts` — non-streaming, `messages.create`, parse text → JSON array
3. `components/proposal/BriefClarifier.tsx` — textarea → 5 questions → user answers → feed enriched brief into F-01
4. Wire into `/proposals/new` as an optional pre-step

Validation gate: vague brief → 5 useful questions → enriched brief → better proposal.

---

## Phase 2 — Deep Features

Prerequisites: Phase 1 complete, at least 10 real proposals tested.

### F-03: Client Memory (RAG)

Build order:
1. Decide on embeddings provider (Voyage AI or OpenAI) and install the SDK
2. `lib/embeddings.ts` — `embed(text): Promise<number[]>`, update `vector()` dimension in DB if using Voyage
3. `app/api/clients/[id]/notes/route.ts` (POST) — save note, trigger background embed + insert to `embeddings`
4. `lib/embedAndStore.ts` — async pipeline: embed → `embeddings.insert` → `client_notes.update({ embedded: true })`
5. `lib/prompts/memory.ts` — synthesis system prompt
6. `app/api/ai/memory/route.ts` — embed query → `match_client_notes` RPC → top-5 → Claude synthesis → return summary
7. Client CRUD routes: `GET/POST /api/clients`, `GET /api/clients/[id]`
8. `/app/(dashboard)/clients/` pages — list, detail, notes tab, "Catch me up" button

Validation gate: add 3 notes about a client → click "Catch me up" → summary references correct facts.

### F-04: Payment Nudge Generator

Build order:
1. Invoice CRUD: `GET/POST /api/invoices`, `PATCH /api/invoices/[id]`
2. `lib/prompts/nudge.ts` — prompt that returns 3 tone variants
3. `app/api/ai/nudge/route.ts` — fetch invoice + client from DB → construct context → return 3 emails
4. `/app/(dashboard)/invoices/` pages — list with overdue detection, detail with nudge button
5. Nudge UI — 3-tab display (polite / firm / serious), copy-to-clipboard

Validation gate: create overdue invoice → generate nudge → all 3 tones are contextually accurate.

### F-05: Scope Creep Detector

Build order:
1. `lib/prompts/scope.ts` — prompt returning `verdict` + `explanation` + `suggested_response`
2. `app/api/ai/scope/route.ts` — accepts `project_id` + `new_request`, fetches `original_scope` from DB, calls Claude
3. Wire into project detail page — "Check Scope" panel
4. Display verdict badge (in scope / out of scope / needs clarification) + suggested reply

Validation gate: project with defined scope → paste out-of-scope request → get correct verdict + usable reply.

---

## Phase 3 — Settings + Key Management

Prerequisites: Phase 2 complete, real users giving feedback.

### F-06: BYOK Key Management UI

Build order:
1. `app/api/settings/api-key/route.ts` (POST + DELETE) — validate key with haiku test call, encrypt, store / delete
2. `/app/(dashboard)/settings/page.tsx` — API key input, validation feedback, masked display, delete button
3. Gate all AI routes on `api_key_set: true` — return `422 NO_API_KEY` if not set, surface friendly onboarding prompt in UI

Validation gate: new user → no key → gets onboarding prompt → saves key → AI features unlock.

### F-07: Subscription Gate — DEFERRED

Paystack integration and usage-based gating are on hold. Will revisit after Phase 2 features are validated with real users.

---

## Build Order Summary

```
Foundation → Phase 1 (F-01 → F-02) → Phase 2 (F-03 → F-04 → F-05) → Phase 3 (F-06 → F-07)
```

Each feature is independently shippable — you can deploy after F-01, after F-02, etc.

**Hard dependency chains:**
- F-03 requires the embeddings provider decision made before any DB work
- F-06 must come before any future subscription work

---

## File Structure (Target)

```
soldr/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── proposals/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── page.tsx
│   └── api/
│       ├── ai/
│       │   ├── proposal/route.ts
│       │   ├── clarify/route.ts
│       │   ├── memory/route.ts
│       │   ├── scope/route.ts
│       │   └── nudge/route.ts
│       ├── clients/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── notes/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── settings/
│       │   └── api-key/route.ts
│       └── webhooks/
│           └── paystack/route.ts           ← deferred (F-07)
├── components/
│   ├── proposal/
│   │   ├── ProposalDrafter.tsx
│   │   └── BriefClarifier.tsx
│   ├── clients/
│   ├── invoices/
│   └── ui/
├── lib/
│   ├── anthropic.ts
│   ├── crypto.ts
│   ├── embeddings.ts
│   ├── embedAndStore.ts
│   ├── supabase/
│   │   ├── server.ts
│   │   └── client.ts
│   └── prompts/
│       ├── proposal.ts
│       ├── clarify.ts
│       ├── memory.ts
│       ├── scope.ts
│       └── nudge.ts
├── middleware/
│   └── withApiKey.ts
├── middleware.ts
└── supabase/
    └── migrations/
        ├── 001_extensions.sql
        ├── 002_user_settings.sql
        ├── 003_clients.sql
        ├── 004_projects.sql
        ├── 005_proposals.sql
        ├── 006_invoices.sql
        ├── 007_client_notes.sql
        ├── 008_embeddings.sql
        ├── 009_match_client_notes.sql
        └── 010_triggers.sql
```
