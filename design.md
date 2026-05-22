# Soldr — Visual Redesign Spec

## Design Philosophy

Restrained, professional, West African-built. The kind of tool a serious Lagos freelancer would trust with a ₦2M proposal. No gradients, no floating badges, no decorative color. Color earns its place only when it carries meaning — status, error, confirmation. Everything else is black, white, and structured gray.

Reference feel: Linear, Vercel dashboard, Raycast. Dark sidebar, clean content, sharp type hierarchy.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `gray-950` | `#0a0a0a` | Sidebar background |
| `gray-900` | `#111827` | Primary buttons, headings |
| `gray-700` | `#374151` | Body text |
| `gray-500` | `#6b7280` | Secondary text, labels |
| `gray-300` | `#d1d5db` | Borders, dividers |
| `gray-100` | `#f3f4f6` | Table row alt, input bg on focus |
| `gray-50`  | `#f9fafb` | Page background |
| `white`    | `#ffffff` | Card backgrounds |
| `green-600` | `#16a34a` | Paid / active / success — text only, no bg fills |
| `red-600`  | `#dc2626` | Overdue / error — text only |
| `yellow-600` | `#ca8a04` | Pending / warning — text only |

**Rule**: Status colors appear as text only — no colored background chips unless the component is a critical alert. Badge backgrounds stay `gray-100` with colored text.

---

## Typography

- **Font**: System font stack (already default in Tailwind). No external font needed.
- **Page heading** (`h1`): `text-xl font-semibold text-gray-900` — not `text-2xl font-bold`. Tighter, more confident.
- **Section heading** (`h2`): `text-sm font-semibold text-gray-900 uppercase tracking-wide`
- **Body**: `text-sm text-gray-700`
- **Muted / labels**: `text-xs text-gray-500`
- **Monospace** (API keys, IDs): `font-mono text-xs`

---

## Layout

### Sidebar
- Background: `bg-gray-950`
- Width: `w-52`
- Logo: `text-white font-semibold text-base` — no special treatment
- Nav links: `text-gray-400 hover:text-white hover:bg-white/5` — subtle hover, no colored highlight
- Active link: `text-white bg-white/10` — white text, very subtle white fill
- Bottom section (Settings): separated by a `border-t border-white/10`

### Content area
- Background: `bg-gray-50`
- Max width: `max-w-4xl` (tighter than current `max-w-5xl`)
- Padding: `px-8 py-8`

### Page header pattern
Every page: title left, primary action right. No decorative elements.
```
h1 (text-xl font-semibold) ←————————→ [Primary Button]
Subtitle (text-sm text-gray-500)
```

---

## Components

### Cards
```
rounded-lg border border-gray-200 bg-white
```
- No shadows unless interactive (hover state only: `hover:shadow-sm`)
- Padding: `p-5` standard, `p-4` compact
- Section dividers inside cards: `border-t border-gray-100`

### Buttons
**Primary**: `bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700`
**Secondary**: `border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50`
**Destructive**: `text-red-600 text-sm font-medium hover:text-red-800` — text only, no background
**Ghost/link**: `text-sm text-gray-500 hover:text-gray-900` — inline links

No other button variants. No colored backgrounds except black.

### Form inputs
```
rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
placeholder:text-gray-400
focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900
```
Labels: `text-sm font-medium text-gray-700` with `mb-1` gap

### Tables
- No background on `thead` — just a bottom border: `border-b border-gray-200`
- Column headers: `text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3`
- Rows: `border-b border-gray-100 last:border-0`
- Row hover: `hover:bg-gray-50`
- No alternating row colors
- Cell text: `text-sm text-gray-700 px-4 py-3`

### Status badges
Minimal. Text + dot, no pill backgrounds:
```
<span class="text-xs font-medium text-green-600">● paid</span>
<span class="text-xs font-medium text-yellow-600">● unpaid</span>
<span class="text-xs font-medium text-red-600">● overdue</span>
<span class="text-xs font-medium text-gray-400">● cancelled</span>
```

### Empty states
Centered, inside a dashed border box:
```
rounded-lg border border-dashed border-gray-200 p-12 text-center
```
- One line of muted text, one CTA link — nothing else

---

## Page-by-Page Changes

### Dashboard (home)
- Remove the 3-column stat cards grid — replace with a simple list of recent proposals and a single "New Proposal" CTA
- Stat numbers feel out of place for a tool this early. Replace with recent activity.

### Proposals list
- Remove card grid if any — use a clean table: Title | Client | Date | —
- Title links to the proposal detail page
- Empty state with one CTA

### Proposal detail (`/proposals/[id]`)
- Increase content padding inside the proposal card: `p-8`
- Section headings in the proposal (`## Project Understanding` etc.) should use `text-sm font-bold uppercase tracking-widest text-gray-500` — more subtle, not dark
- Body text: `text-sm text-gray-800 leading-relaxed`
- Table inside proposal: full-width, clean, no background fills on header

### New Proposal page (`/proposals/new`)
- Brief textarea: taller (rows=10), full width
- Label + description tighter
- "Continue" button: full width on mobile

### Payment Nudge
- Tone cards: no badge pills — use a left border accent instead:
  - Friendly: `border-l-4 border-gray-300`
  - Firm: `border-l-4 border-gray-600`
  - Final: `border-l-4 border-gray-900`
- Remove badge entirely — tone name as `text-xs font-semibold uppercase tracking-wide text-gray-500`

### Scope Creep Detector
- Verdict displayed as large text, not a badge:
  - In scope: `text-base font-semibold text-green-600`
  - Out of scope: `text-base font-semibold text-red-600`
  - Needs clarification: `text-base font-semibold text-yellow-600`
- Remove the badge component entirely

### Clients list
- Table only — no card grid
- Client name is a link, underline on hover

### Client detail
- Two-column summary (proposals / invoices) stays but as plain numbers, no card border
- Notes: single-line input at the top, notes listed below as plain text with date
- "Catch me up" button: secondary style, sits next to the Notes heading

### Invoices list
- Status as colored dot text (see status badges above)
- Amount in `font-mono` or at least `tabular-nums`

### Settings
- API key card: full width max-w-lg, no nested card — just sections separated by `border-t`

---

## What Gets Removed

- All colored badge backgrounds (`bg-green-50`, `bg-yellow-50`, `bg-red-50`) — replaced with text-only status
- Colored top bars on nudge cards (already removed)
- The `prose-headings:text-center` on proposal headings — centered headings look informal for a business document; left-align with a bottom border only
- `font-bold uppercase` on proposal section headings — replace with `font-semibold` in a muted gray
- Any `bg-gray-900` used decoratively — reserved for primary buttons only

---

## Tailwind Config Addition

Add a `gray-950` shade since Tailwind v3 doesn't include it by default:

```ts
theme: {
  extend: {
    colors: {
      gray: {
        950: '#0a0a0a',
      }
    }
  }
}
```
