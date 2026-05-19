# Product Requirements Document
## Soldr — AI-Powered Freelance Operating System

**Version:** 1.0  
**Date:** May 2026  
**Author:** [Your Name]  
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

Freelancers spend a significant portion of their working hours on non-billable operational tasks: writing proposals, scoping projects, chasing payments, re-reading old email threads before client calls, and managing scope creep. These tasks are repetitive, mentally draining, and directly eat into income.

Existing tools (Bonsai, HoneyBook, AND.CO) are form-based and passive — they store information but do nothing with it. They don't draft, don't think, and don't act.

### 1.2 Solution

Soldr is an AI-native freelance operating system. It actively handles the operational layer of a freelance business — proposals, client memory, payment follow-ups, scope management — so the freelancer only focuses on the actual work.

It is built BYOK (Bring Your Own Key): users connect their own Anthropic API key. Soldr provides the product layer on top.

### 1.3 Target Users

**Primary:** Independent software developers, designers, and consultants doing project-based client work.  
**Secondary:** Small agencies (2–5 person teams) managing multiple client relationships.  
**Geography (initial):** Nigeria and West Africa, expanding globally.

### 1.4 Success Metrics

| Metric | Target (Month 3) | Target (Month 6) |
|---|---|---|
| Weekly active users | 50 | 300 |
| Paying subscribers | 10 | 80 |
| Proposals generated/week | 100 | 800 |
| Avg. time saved per user/week | 3 hrs | 3 hrs |
| Monthly Recurring Revenue | $150 | $1,200 |

---

## 2. User Personas

### Persona A — Solo Dev Freelancer
- **Name:** Tunde, 26, Lagos
- **Work:** Full-stack web development, 4–6 active clients at a time
- **Pain:** Spends 3–4 hrs/week writing proposals and following up on unpaid invoices. Forgets client context between long gaps.
- **Goal:** More billable hours, less admin

### Persona B — Design Consultant
- **Name:** Amara, 30, Accra
- **Work:** Brand and UI/UX projects, mostly via referrals
- **Pain:** Scope creep on almost every project. Struggles to push back professionally.
- **Goal:** Protect her time, look more professional to clients

---

## 3. Features

### Phase 1 — Core (MVP, Weeks 1–2)

#### F-01: Proposal Drafter
- **Input:** Free-text client brief (pasted or typed)
- **Output:** Structured proposal with: project summary, deliverables list, timeline, suggested price range, and payment terms
- **AI behaviour:** Extracts requirements, makes scope assumptions explicit, flags ambiguities
- **User actions:** Edit inline, copy to clipboard, or export as PDF

#### F-02: Brief Clarifier
- **Input:** Client brief
- **Output:** 5 targeted clarifying questions to send the client before scoping begins
- **Purpose:** Prevents wasted scoping time on wrong assumptions

---

### Phase 2 — Deep Features (Weeks 3–4)

#### F-03: Client Memory
- **Behaviour:** Every project note, decision, preference, and communication summary saved per client
- **Retrieval:** Before a meeting or call, user triggers "Catch me up on [Client Name]" — system surfaces relevant context via RAG
- **Storage:** Per-user vector store in Supabase with pgvector

#### F-04: Payment Nudge Generator
- **Input:** Invoice details (amount, due date, client name)
- **Output:** Three pre-drafted follow-up emails — polite (7 days overdue), firm (14 days), serious (30 days)
- **Tone calibration:** User can set tone preference per client

#### F-05: Scope Creep Detector
- **Input:** Original project scope + new client request
- **Output:** Classification — In Scope / Out of Scope / Needs Change Order — with explanation and suggested response to client

---

### Phase 3 — Monetisation Layer (Weeks 5–6)

#### F-06: BYOK Key Management
- Users enter their Anthropic API key in settings
- Key is encrypted at rest (AES-256), never logged
- All AI requests made server-side using the user's key

#### F-07: Subscription Gate
- Free tier: 5 proposals/month, no client memory
- Pro tier ($15/mo): Unlimited proposals, client memory, all features
- Payment via Paystack (Naira + card support)

---

## 4. Out of Scope (v1)

- Time tracking
- Native calendar integration
- Mobile app
- Team/agency collaboration features
- Automated email sending (user copies and sends manually)

---

## 5. User Flows

### 5.1 New User Onboarding
1. Sign up with email
2. Enter Anthropic API key → validated with a test call
3. Shown the proposal drafter immediately (no empty state)
4. Optional: add first client profile

### 5.2 Proposal Flow
1. User pastes client brief
2. Clicks "Draft Proposal"
3. AI streams proposal in real time
4. User edits inline
5. Copies to clipboard or exports PDF

### 5.3 Pre-Call Memory Retrieval
1. User selects client from sidebar
2. Clicks "Catch me up"
3. System queries vector store for relevant context
4. Returns a 3–5 bullet summary of key context

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Proposal generation latency | < 8 seconds (streamed) |
| App load time | < 2 seconds |
| Uptime | 99.5% |
| Data encryption | AES-256 at rest, TLS in transit |
| API key storage | Encrypted, never exposed client-side |

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Users unwilling to share Anthropic API key | Medium | Clear explanation of BYOK model; key never leaves server |
| Anthropic free tier rate limits | Medium | Graceful error handling; prompt user to upgrade their plan |
| Low conversion free → paid | Medium | Make Pro features obviously valuable before paywall |
| Scope creep in build | High | Strict phase discipline; ship Phase 1 before touching Phase 2 |
