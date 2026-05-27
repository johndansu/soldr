# Soldr — Feature Roadmap

## Already Built
- [x] Auth + onboarding
- [x] Clients — list, add, notes, AI "catch me up" briefing
- [x] Proposals — AI generation, view, send, public signing page
- [x] Invoices — list, add, detail, mark paid, partial payments, public page, share, send to client, CSV export
- [x] Recurring invoices — templates, auto-generate, cron job
- [x] Contracts — AI generation, professional e-signature, public signing page, status timeline
- [x] Scope Creep Detector
- [x] Nudge Generator
- [x] Income Report — KPI cards, by client, by month, multi-currency, print
- [x] Dashboard "Needs Action" panel — overdue, accepted proposals, unsigned contracts, due-soon

---

## To Build

### Financial
- [x] Expense tracking — log expenses (amount, category, date, description) + P&L view in income report
- [ ] Tax estimation — auto-set aside X% of each payment received, running tax liability tracker
- [ ] Paystack / Stripe payment link — pay invoice directly from the public invoice page
- [ ] Auto late fees — add a late fee to overdue invoices after a set number of days

### Documents & Client-facing
- [x] PDF export — one-click PDF download for invoices and contracts
- [ ] Proposal templates — save a proposal as a reusable template
- [ ] Contract templates — save a contract as a reusable template
- [x] Client portal — one `/portal/[token]` URL per client showing all their invoices, proposals, and contracts

### Automation
- [x] Overdue invoice reminders — auto-email clients on day 1, 7, 14 after due date (cron-based)
- [ ] Proposal follow-up reminders — alert when a sent proposal has no response after X days
- [ ] Contract expiry warnings — alert before a contract end date passes

### Time & Projects
- [x] Time tracker — log hours against a client, auto-generate invoice from logged time
- [ ] Project board — milestones, status, linked to client and invoices

### AI Writing Tools
- [ ] Cold outreach email writer — AI-drafted first-contact emails for new leads
- [ ] Project debrief / case study generator — turn a completed project into a portfolio write-up
- [ ] Testimonial request generator — AI-crafted message asking clients for a review
- [ ] Services / bio page generator — generate a shareable freelancer profile page

### Analytics
- [ ] Client lifetime value — total billed per client, all time
- [ ] Proposal conversion rate — sent vs accepted, by time period
- [ ] Revenue forecast — based on recurring templates and open proposals

### Settings & Branding
- [x] Logo upload — appears on invoices and public-facing pages
- [x] Custom email signature — personalised sign-off on all outbound emails
- [x] Custom invoice prefix — e.g. `ACME-001` instead of `INV-001`
