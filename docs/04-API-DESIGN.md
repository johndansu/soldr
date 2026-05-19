# API Design Document
## Soldr — AI-Powered Freelance Operating System

**Base URL:** `https://soldr.app/api`  
**Auth:** Supabase JWT — pass `Authorization: Bearer <token>` on all requests  
**Format:** JSON request/response unless otherwise noted  
**Streaming:** AI endpoints return `text/event-stream` (Server-Sent Events)

---

## Conventions

- All IDs are UUIDs
- All timestamps are ISO 8601 UTC (`2026-05-19T10:00:00Z`)
- Errors follow a consistent shape (see Error Handling below)
- Monetary amounts are integers in the smallest currency unit (kobo for NGN, cents for USD)

---

## Error Handling

All errors return a consistent JSON body:

```json
{
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "No invoice found with the given ID",
    "status": 404
  }
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request — validation error |
| 401 | Unauthenticated — missing or invalid JWT |
| 403 | Forbidden — resource belongs to another user |
| 404 | Resource not found |
| 422 | Unprocessable — business logic error (e.g. no API key set) |
| 429 | Rate limited |
| 500 | Internal server error |

---

## AI Endpoints

### POST /api/ai/proposal
Generate a proposal from a client brief. Streams the response.

**Request**
```json
{
  "brief": "Build a mobile-first e-commerce website for a Lagos fashion brand. Should support product listings, cart, and Paystack checkout. Timeline flexible.",
  "client_id": "uuid (optional — attaches to client if provided)",
  "project_id": "uuid (optional)"
}
```

**Response** — `text/event-stream`
```
data: {"type":"delta","text":"## Project Proposal\n\n"}
data: {"type":"delta","text":"**Client:** Fashion Brand\n"}
...
data: {"type":"done","proposal_id":"uuid"}
```

After streaming completes, the full proposal is saved to the `proposals` table and the `proposal_id` is returned in the final event.

**Errors**
- `422 NO_API_KEY` — user has not set their Anthropic API key
- `429 RATE_LIMITED` — Anthropic rate limit hit on user's key

---

### POST /api/ai/clarify
Generate clarifying questions from a client brief.

**Request**
```json
{
  "brief": "I need a dashboard for my team to track sales."
}
```

**Response** — `application/json`
```json
{
  "questions": [
    "How many team members will use this dashboard, and do they need different permission levels?",
    "What is the primary data source — a CRM like Salesforce, a spreadsheet, or a custom database?",
    "Should the dashboard support real-time updates or are daily snapshots acceptable?",
    "Are there specific KPIs or metrics you already track that must be included?",
    "Do you need the dashboard to be embeddable in an existing tool, or is a standalone web app acceptable?"
  ]
}
```

---

### POST /api/ai/memory
Retrieve a pre-call context summary for a client using RAG.

**Request**
```json
{
  "client_id": "uuid",
  "context": "Preparing for a project kickoff call"
}
```

**Response** — `application/json`
```json
{
  "summary": "Key context for your call with Acme Corp:\n\n- Prefers async communication over calls where possible\n- Previously flagged concern about mobile performance on the checkout flow\n- Budget conversation from March: approved up to ₦800k for Phase 2\n- Decision maker is Femi (CTO), not the PM you usually email\n- Last deliverable (v2 designs) was approved on 14 April with minor revisions pending",
  "sources": [
    { "note_id": "uuid", "created_at": "2026-03-12T09:00:00Z" },
    { "note_id": "uuid", "created_at": "2026-04-14T14:23:00Z" }
  ]
}
```

---

### POST /api/ai/scope
Detect whether a new client request is within the original project scope.

**Request**
```json
{
  "project_id": "uuid",
  "original_scope": "Build a 5-page marketing website with contact form and blog.",
  "new_request": "Can you also add an e-commerce section with product listings and checkout?"
}
```

**Response** — `application/json`
```json
{
  "verdict": "out_of_scope",
  "explanation": "The original scope covered a marketing website with static pages, a contact form, and a blog. An e-commerce section with product listings and checkout involves a separate data model, payment integration, and significantly more frontend work.",
  "suggested_response": "Hi [Client], happy to add an e-commerce section to the project! This would be outside the original scope as it involves additional development work. I can put together a separate proposal for this — typically this kind of addition runs between ₦150k–250k depending on the complexity. Want me to scope it out?",
  "verdict_options": ["in_scope", "out_of_scope", "needs_clarification"]
}
```

---

### POST /api/ai/nudge
Generate payment follow-up emails for an overdue invoice.

**Request**
```json
{
  "invoice_id": "uuid",
  "tone": "firm"
}
```

**Response** — `application/json`
```json
{
  "emails": [
    {
      "tone": "polite",
      "days_overdue": 7,
      "subject": "Friendly reminder — Invoice #INV-042 due",
      "body": "Hi [Client Name],\n\nI hope you're doing well. I wanted to send a quick reminder that Invoice #INV-042 for ₦120,000 was due on 12 May. If payment has already been sent, please disregard this message.\n\nIf you need any adjustments or have questions, I'm happy to help.\n\nBest,\n[Your Name]"
    },
    {
      "tone": "firm",
      "days_overdue": 14,
      "subject": "Second notice — Invoice #INV-042 now 14 days overdue",
      "body": "Hi [Client Name],\n\nI'm following up again regarding Invoice #INV-042 for ₦120,000, which was due on 12 May and is now 14 days overdue.\n\nCould you confirm an expected payment date? I'd like to resolve this promptly so we can continue working together without interruption.\n\nRegards,\n[Your Name]"
    },
    {
      "tone": "serious",
      "days_overdue": 30,
      "subject": "Final notice — Invoice #INV-042 (30 days overdue)",
      "body": "Hi [Client Name],\n\nDespite previous reminders, Invoice #INV-042 for ₦120,000 remains unpaid at 30 days overdue. This is a final notice before I escalate this matter.\n\nI require payment by [Date + 7 days] to avoid further action. Please confirm receipt of this message.\n\n[Your Name]"
    }
  ]
}
```

---

## Client Endpoints

### GET /api/clients
List all clients for the authenticated user.

**Query params:** `status=active|inactive|archived`, `search=string`

**Response**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "femi@acme.ng",
      "company": "Acme Corp",
      "status": "active",
      "tags": ["retainer", "design"],
      "created_at": "2026-01-15T08:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /api/clients
Create a new client.

**Request**
```json
{
  "name": "Acme Corp",
  "email": "femi@acme.ng",
  "company": "Acme Corp",
  "timezone": "Africa/Lagos",
  "tags": ["retainer"]
}
```

**Response** — `201 Created`
```json
{
  "client": { "id": "uuid", "name": "Acme Corp", "..." }
}
```

---

### GET /api/clients/:id
Get a single client with their recent projects and notes.

**Response**
```json
{
  "client": {
    "id": "uuid",
    "name": "Acme Corp",
    "projects": [ { "id": "uuid", "name": "Website Redesign", "status": "active" } ],
    "recent_notes": [ { "id": "uuid", "content": "Prefers async updates", "created_at": "..." } ],
    "open_invoices": 1,
    "total_billed": 450000
  }
}
```

---

### POST /api/clients/:id/notes
Save a note for a client. Also triggers background embedding for vector store.

**Request**
```json
{
  "content": "Client confirmed budget cap of ₦800k for Phase 2. Decision maker is the CTO.",
  "project_id": "uuid (optional)",
  "source": "manual"
}
```

**Response** — `201 Created`
```json
{
  "note": { "id": "uuid", "content": "...", "embedded": false, "created_at": "..." }
}
```

The `embedded` field updates to `true` asynchronously once the vector is stored.

---

## Invoice Endpoints

### GET /api/invoices
List invoices. Supports filtering.

**Query params:** `status=unpaid|paid|overdue`, `client_id=uuid`

**Response**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "client": { "id": "uuid", "name": "Acme Corp" },
      "amount": 12000000,
      "currency": "NGN",
      "due_date": "2026-05-12",
      "status": "overdue",
      "days_overdue": 7,
      "nudge_count": 1
    }
  ]
}
```

---

### POST /api/invoices
Create an invoice.

**Request**
```json
{
  "client_id": "uuid",
  "project_id": "uuid (optional)",
  "amount": 12000000,
  "currency": "NGN",
  "due_date": "2026-06-01",
  "description": "Phase 1 delivery — website design"
}
```

**Response** — `201 Created`

---

### PATCH /api/invoices/:id
Update invoice status (e.g. mark as paid).

**Request**
```json
{
  "status": "paid",
  "paid_date": "2026-05-19"
}
```

---

## Settings Endpoints

### POST /api/settings/api-key
Save or update the user's Anthropic API key. The key is validated by making a minimal test call before saving.

**Request**
```json
{
  "api_key": "sk-ant-..."
}
```

**Response**
```json
{
  "success": true,
  "api_key_set": true
}
```

**Errors**
- `400 INVALID_API_KEY` — key failed validation with Anthropic

---

### DELETE /api/settings/api-key
Remove the stored API key.

---

## Webhook Endpoints

### POST /api/webhooks/paystack
Receives payment events from Paystack. Verifies the `x-paystack-signature` header (HMAC-SHA512) before processing.

**Events handled:**
- `charge.success` — activates Pro subscription
- `subscription.disable` — downgrades to free tier

This endpoint always returns `200 OK` to Paystack immediately, then processes the event asynchronously.

---

## Rate Limits

| Endpoint group | Limit |
|---|---|
| AI endpoints | 20 requests/minute per user |
| Client / Invoice CRUD | 100 requests/minute per user |
| Webhook | No limit (verified by signature) |

Rate limit headers returned on every response:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 17
X-RateLimit-Reset: 1716112800
```
