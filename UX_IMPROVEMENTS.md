# Soldr — UX Improvements

## Core Problem
The app is built around features, not the freelancer's job to be done.
A freelancer doesn't think "I want to use Payment Nudge" — they think
"Acme Corp hasn't paid me, what do I do?"

---

## Issue 1 — Nav names are internal, not user language
**Current:** Dashboard · Proposals · Payment Nudge · Scope Creep · Clients · Projects · Invoices · Settings

**Problems:**
- "Payment Nudge" is a product team name. Users say "chase a client" or "follow up"
- "Scope Creep" sounds alarming and technical
- 8 items with no hierarchy — everything feels equally important

**Fix:**
- Rename "Payment Nudge" → "Nudge" (short, action-oriented)
- Rename "Scope Creep" → "Scope Check" (neutral, descriptive)
- Reorder to match the freelancer workflow: Dashboard → Clients → Proposals → Invoices → Projects
- Move Nudge + Scope Check under a visual "Tools" divider — they're utilities, not destinations
- Bottom nav (mobile): Dashboard · Proposals · Invoices · Clients · Settings

---

## Issue 2 — 8 nav items with no hierarchy
**Fix:**
Primary (core workflow):
  1. Dashboard
  2. Clients
  3. Proposals
  4. Invoices
  5. Projects

Tools (AI utilities — below a divider):
  6. Nudge
  7. Scope Check

Bottom: Settings

---

## Issue 3 — No first-run experience
A new user signs in and sees an empty dashboard with no guidance.

**Fix:**
- If user has no clients: show a "Get started" banner with 3 steps:
  1. Add your first client
  2. Write a proposal
  3. Create an invoice
- Steps complete progressively as user takes action
- Banner disappears once all 3 are done
- Stored in user_settings (onboarding_step: 0|1|2|3)

---

## Issue 4 — BYOK kills mainstream adoption
Requiring an Anthropic API key blocks non-technical users before they
see a single AI feature.

**Fix (Phase 2):**
- Add a platform-level API key as fallback
- Show BYOK only in Settings as "bring your own key for unlimited usage"
- Users get N free AI calls per month before BYOK is required

---

## Issue 5 — Nudge and Scope are top-level nav, not contextual
These are tools that help you act — they should surface *where you need them*,
not require a separate navigation step.

**Current flow:** Invoice → go to Nudge nav → manually enter client context
**Better flow:** Invoice detail → "Nudge client" button → pre-filled, one click

**Fix:**
- Nudge: already linked from invoice detail — keep it, reinforce the entry point
- Scope: link from proposal detail and project detail with "Run scope check" button
- Keep Nudge/Scope in nav as Tools for history/access, but the primary entry
  is contextual from the relevant page

---

## Issue 6 — Projects and Clients overlap confusingly
A freelancer doesn't naturally distinguish "client" from "project" when
they only have one project per client (which is most of the time).

**Fix:**
- Keep both — they serve different users (agency vs solo freelancer)
- Make the relationship clearer: on Client 360, show "Projects" section
- On new project form, pre-select client from URL param
- Long-term: make Projects optional (power users only)

---

## Build Order

### Phase 1 — Nav + Language (build now)
- [x] Write this file
- [ ] Reorder nav: Dashboard → Clients → Proposals → Invoices → Projects
- [ ] Add Tools divider in sidebar with Nudge + Scope Check
- [ ] Rename "Payment Nudge" → "Nudge" everywhere (nav, headings, buttons)
- [ ] Rename "Scope Creep" → "Scope Check" everywhere
- [ ] Fix mobile bottom nav order

### Phase 2 — Onboarding (build now)
- [ ] Add onboarding_step to user_settings (or derive from data)
- [ ] Dashboard onboarding banner: 3-step progress (Add client → Write proposal → Send invoice)
- [ ] Banner hides once all 3 are done

### Phase 3 — Contextual AI entry points
- [ ] "Run scope check" button on proposal detail page
- [ ] "Nudge client" already on invoice detail — add to client 360 overdue section too
- [ ] Scope check → link to relevant project if one exists

### Phase 4 — BYOK softening (later)
- [ ] Platform key as default fallback
- [ ] BYOK in Settings as "upgrade path" for power users
