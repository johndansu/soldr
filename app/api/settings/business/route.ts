import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data } = await supabase
    .from('user_settings')
    .select('business_name, business_email, business_address, business_phone, bank_details, default_tax_rate, default_currency, invoice_prefix, logo_url, email_signature, tax_aside_pct')
    .eq('user_id', user.id)
    .single()

  return Response.json(data ?? {})
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      business_name:    body.businessName    ?? null,
      business_email:   body.businessEmail   ?? null,
      business_address: body.businessAddress ?? null,
      business_phone:   body.businessPhone   ?? null,
      bank_details:     body.bankDetails     ?? null,
      default_tax_rate: body.defaultTaxRate  ?? 0,
      default_currency: body.defaultCurrency ?? 'NGN',
      invoice_prefix:   body.invoicePrefix?.trim().toUpperCase() || 'INV',
      logo_url:         body.logoUrl        ?? null,
      email_signature:  body.emailSignature ?? null,
      tax_aside_pct:    body.taxAsidePct    ?? 0,
    }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: 'DB_ERROR' }, { status: 500 })
  return Response.json({ ok: true })
}
