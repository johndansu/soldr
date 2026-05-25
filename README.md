# Soldr — AI Freelance OS

An all-in-one platform for freelancers to manage clients, proposals, contracts, invoices, and finances — with AI built in throughout.

---

## Features

### Core workflow
- **Clients** — client directory with notes, AI-powered "catch me up" briefing
- **Proposals** — AI-generated proposals with brief clarifier, public acceptance page, send via email
- **Contracts** — AI-generated contracts with 16 legal sections, typed e-signature, public signing page
- **Invoices** — line items, tax, discount, partial payments, CSV export, public shareable page
- **Recurring invoices** — weekly/monthly/quarterly templates, auto-generate on schedule
- **Projects** — link proposals, invoices, and contracts to a project

### Finance
- **Income report** — billed vs collected by client and by month, multi-currency, print/PDF
- **Expenses** — log business expenses by category, P&L view in income report
- **PDF export** — one-click PDF download for invoices and contracts

### AI tools
- **Scope Creep Detector** — paste a client request, get a risk analysis against your original scope
- **Nudge Generator** — AI-drafted payment reminder emails, personalised per client
- **Proposal AI** — brief clarifier + full proposal drafter with streaming output

### Automation
- **Overdue reminders** — auto-email clients at day 1, 7, and 14 after invoice due date
- **Recurring invoice cron** — daily job generates invoices from active templates

### Settings
- Business profile (name, email, phone, address, bank details)
- Custom invoice prefix (e.g. `ACME-001` instead of `INV-001`)
- Default tax rate and currency
- BYOK — bring your own Anthropic API key for AI features

---

## Stack

| Layer     | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Database  | Supabase (Postgres + Auth + RLS) |
| Styling   | Tailwind CSS |
| AI        | OpenRouter (dev) / Anthropic API BYOK (prod) |
| Email     | Resend |
| PDF       | @react-pdf/renderer |
| Search    | pgvector embeddings via Supabase |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/johndansu/soldr.git
cd soldr
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run all migrations in order:

```
supabase/migrations/001_extensions.sql
supabase/migrations/002_user_settings.sql
...through...
supabase/migrations/023_invoice_prefix.sql
```

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ENCRYPTION_SECRET` | Random 32-byte secret — run `openssl rand -base64 32` |
| `AI_PROVIDER` | `openrouter` (dev) or `anthropic` (prod with BYOK) |
| `OPENROUTER_API_KEY` | OpenRouter key — free tier at [openrouter.ai](https://openrouter.ai) |
| `RESEND_API_KEY` | Resend key for transactional email |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `Soldr <noreply@yourdomain.com>`) |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `http://localhost:4000`) |
| `CRON_SECRET` | Random string — add the same value to Vercel env vars |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Vercel

1. Connect the repo to Vercel
2. Add all environment variables from `.env.local.example` in Vercel Dashboard → Settings → Environment Variables
3. Add `CRON_SECRET` — Vercel uses this to authenticate the daily cron jobs
4. Deploy

Cron jobs run automatically via `vercel.json`:
- `0 6 * * *` — generate due recurring invoices
- `0 7 * * *` — send overdue invoice reminders

### Supabase RLS

All tables use Row Level Security. Every policy restricts data to `auth.uid() = user_id`. Public-facing pages (invoice, proposal, contract) use public tokens — no auth required to view.

---

## Project structure

```
app/
  api/          — API routes
  dashboard/    — authenticated dashboard pages
  invoice/      — public invoice page (/invoice/[token])
  proposal/     — public proposal page (/proposal/[token])
  contract/     — public contract signing page (/contract/[token])
components/
  clients/
  contracts/
  invoices/
  proposals/
  reports/
  settings/
  ui/           — shared UI components
lib/
  ai.ts         — AI provider abstraction (OpenRouter / Anthropic BYOK)
  email.ts      — Resend email templates
  pdf/          — @react-pdf/renderer document components
  prompts/      — AI prompt builders
supabase/
  migrations/   — run these in order in Supabase SQL Editor
```

---

## AI setup

Soldr uses AI for proposals, contracts, scope detection, and nudge emails.

**Development (default):** Uses OpenRouter with free models. Set `AI_PROVIDER=openrouter` and add your `OPENROUTER_API_KEY`.

**Production (BYOK):** Users bring their own Anthropic API key via Settings. The key is encrypted at rest using `ENCRYPTION_SECRET`. Set `AI_PROVIDER=anthropic`.
