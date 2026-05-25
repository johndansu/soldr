import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Soldr <noreply@soldr.app>'

function isConfigured() {
  return !!process.env.RESEND_API_KEY
}

// ─── Invoice ────────────────────────────────────────────────────────────────

interface SendInvoiceParams {
  to: string
  clientName: string
  businessName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  publicUrl: string
}

export async function sendInvoiceEmail(p: SendInvoiceParams) {
  if (!isConfigured()) throw new Error('RESEND_API_KEY not set')

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `Invoice ${p.invoiceNumber} from ${p.businessName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 32px 24px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af">Invoice</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827">${p.invoiceNumber}</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Hi ${p.clientName},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">Please find your invoice from <strong style="color:#111827">${p.businessName}</strong> below.</p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:13px;color:#6b7280">Amount due</span>
          <span style="font-size:13px;font-weight:600;color:#111827">${p.amount}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:13px;color:#6b7280">Due date</span>
          <span style="font-size:13px;color:#111827">${p.dueDate}</span>
        </div>
      </div>
      <a href="${p.publicUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px">View invoice →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}

// ─── Proposal ───────────────────────────────────────────────────────────────

interface SendProposalParams {
  to: string
  clientName: string
  businessName: string
  proposalTitle: string
  publicUrl: string
}

export async function sendProposalEmail(p: SendProposalParams) {
  if (!isConfigured()) throw new Error('RESEND_API_KEY not set')

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `Proposal from ${p.businessName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 32px 24px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af">Proposal</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827">${p.proposalTitle}</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Hi ${p.clientName},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6"><strong style="color:#111827">${p.businessName}</strong> has sent you a proposal. Review it and accept directly from the link below.</p>
      <a href="${p.publicUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px">Review proposal →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}

// ─── Nudge ──────────────────────────────────────────────────────────────────

interface SendNudgeParams {
  to: string
  subject: string
  body: string
  fromName: string
}

export async function sendNudgeEmail(p: SendNudgeParams) {
  if (!isConfigured()) throw new Error('RESEND_API_KEY not set')

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: p.subject,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap">${p.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}

// ─── Contract ────────────────────────────────────────────────────────────────

interface SendContractParams {
  to: string
  clientName: string
  businessName: string
  contractTitle: string
  publicUrl: string
}

export async function sendContractEmail(p: SendContractParams) {
  if (!isConfigured()) throw new Error('RESEND_API_KEY not set')

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `Service Agreement from ${p.businessName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 32px 24px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af">Service Agreement</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827">${p.contractTitle}</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Hi ${p.clientName},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6"><strong style="color:#111827">${p.businessName}</strong> has sent you a service agreement. Please review and sign it via the link below.</p>
      <a href="${p.publicUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px">Review &amp; sign →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}

// ─── Contract signed (notify freelancer) ─────────────────────────────────────

interface ContractSignedParams {
  to: string
  clientName: string
  contractTitle: string
  contractUrl: string
}

export async function sendContractSignedEmail(p: ContractSignedParams) {
  if (!isConfigured()) return

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `${p.clientName} signed your contract`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 32px 24px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">✓</span>
        <div>
          <p style="margin:0;font-size:15px;font-weight:600;color:#15803d">${p.clientName} signed your contract</p>
          <p style="margin:4px 0 0;font-size:13px;color:#16a34a">${p.contractTitle}</p>
        </div>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">You can now invoice with confidence — both parties have agreed to the terms.</p>
      <a href="${p.contractUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px">View contract →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}

// ─── Proposal accepted (notify freelancer) ───────────────────────────────────

interface ProposalAcceptedParams {
  to: string           // freelancer's email
  clientName: string
  proposalTitle: string
  proposalUrl: string  // dashboard link
}

export async function sendProposalAcceptedEmail(p: ProposalAcceptedParams) {
  if (!isConfigured()) return  // silent — notification is best-effort

  return resend.emails.send({
    from: FROM,
    to: p.to,
    subject: `${p.clientName} accepted your proposal`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="padding:32px 32px 24px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">✓</span>
        <div>
          <p style="margin:0;font-size:15px;font-weight:600;color:#15803d">${p.clientName} accepted your proposal</p>
          <p style="margin:4px 0 0;font-size:13px;color:#16a34a">${p.proposalTitle}</p>
        </div>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6">Time to get to work. You can now create an invoice directly from the proposal.</p>
      <a href="${p.proposalUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px">View proposal →</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
      <p style="margin:0;font-size:11px;color:#d1d5db">Sent via <strong>Soldr</strong></p>
    </div>
  </div>
</body>
</html>`,
  })
}
