# Soldr — Product Roadmap

## Context
Soldr is an AI-native freelance OS. The core loop is:
**Write proposal → win client → deliver → invoice → collect payment → nudge if late**

All features must serve that loop. Nothing should be decorative.

---

## Phase 1 — Core Gaps (Building now)

### 1. Dashboard — Financial Command Center
The dashboard must answer three questions in under 3 seconds:
- How much am I owed right now?
- What is overdue and needs action?
- How is my business performing this month vs YTD?

**Build:**
- [ ] 4-stat summary: Outstanding | Overdue | Collected this month | YTD revenue
- [ ] Overdue alert strip: each overdue invoice with client, amount, days late, quick Nudge link
- [ ] Recent proposals with status badges (Draft / Sent / Accepted / Rejected)
- [ ] Unpaid invoice list with due dates
- [ ] Quick-action bar: New proposal | New invoice

### 2. Proposal Status
Proposals currently have a `status` DB field that is never surfaced in the UI.

**Build:**
- [ ] Status badge on proposals list (Draft · Sent · Accepted · Rejected · Expired)
- [ ] Status toggle buttons on proposal detail page
- [ ] PATCH /api/proposals/[id] extended to accept `status`
- [ ] Status column on proposals list table

### 3. Client 360 View
Client detail page shows notes and a proposal/invoice count. It should be a full
engagement history so you can understand the relationship at a glance.

**Build:**
- [ ] Outstanding balance for this client (sum of unpaid invoices)
- [ ] Total billed and total collected
- [ ] All proposals (clickable) with status badges
- [ ] All invoices (clickable) with amounts and status
- [ ] Quick actions: New proposal for client | New invoice for client

---

## Phase 2 — Structure (Next)

### 4. Project Concept
A Project ties client → proposal → scope → invoices → payments into one thread.
Currently you jump between 5 sections to understand one engagement.

**Schema:**
```sql
create table projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  name        text not null,
  status      text default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  budget      numeric(12,2),
  currency    text default 'NGN',
  start_date  date,
  end_date    date,
  created_at  timestamptz default now()
);
```

**Build:**
- Projects list page
- Project detail: proposal, scope results, invoices, payments in timeline
- Link proposals, invoices, scope_results to project_id

### 5. Recurring Invoices
Freelancers with retainer clients need monthly auto-invoicing.

**Schema:**
```sql
create table invoice_templates (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  frequency       text not null check (frequency in ('weekly', 'monthly', 'quarterly')),
  next_run_date   date not null,
  line_items      jsonb default '[]',
  tax_rate        numeric(5,2) default 0,
  currency        text default 'NGN',
  notes           text,
  active          boolean default true,
  created_at      timestamptz default now()
);
```

**Build:**
- Recurring invoice setup UI
- Cron job (Supabase edge function or external) to generate invoices on schedule
- "Recurring" badge on invoice list for template-generated invoices

---

## Phase 3 — Integrations

### 6. Direct Email Sending (Resend)
Currently nudge emails are copy-paste. Should send directly.

**Build:**
- Resend API integration (BYOK or platform key)
- "Send" button on nudge generator
- Delivery status tracking
- Email open tracking (optional)

### 7. Mobile Layout
The sidebar layout is desktop-only.

**Build:**
- Collapsible sidebar on mobile (hamburger)
- Bottom nav for mobile
- Invoice and proposal views are already mostly responsive

### 8. Tax Reporting Export
Freelancers need income summaries for tax purposes.

**Build:**
- Date-range selector
- CSV export: all invoices with client, amount, status, dates
- Summary: gross billed, total collected, outstanding

---

## Completed

- [x] AI Proposal Drafter
- [x] Payment Nudge Generator (3-tone)
- [x] Scope Creep Detector
- [x] Client Management + Notes + Catch Me Up briefing
- [x] Invoice creation (WYSIWYG editor, line items, tax, discount)
- [x] Public shareable invoice link + print
- [x] Invoice status (unpaid → paid, overdue detection)
- [x] BYOK settings (bring your own API key)
- [x] Business profile (invoice branding)
- [x] Proposal → Invoice (one-click, pre-filled)
- [x] Invoice → Payment Nudge (pre-filled context)
- [x] Payment Nudge → Invoice link
- [x] Invoice partial payment recording

---

## Design Principles
1. Every screen answers a specific question a freelancer has.
2. AI features reduce cognitive load, not add to it.
3. One click to get from any problem to its solution.
4. No feature that requires onboarding to understand.
