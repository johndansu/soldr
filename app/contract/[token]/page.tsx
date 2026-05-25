import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContractDocument } from '@/components/contracts/ContractDocument'
import { ContractSignButton } from '@/components/contracts/ContractSignButton'
import { PrintButton } from '@/components/ui/PrintButton'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PublicContractPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, content, status, created_at, signed_at, public_token, user_id, clients(name, email)')
    .eq('public_token', params.token)
    .single()

  if (!contract) return notFound()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('business_name, business_email')
    .eq('user_id', contract.user_id)
    .single()

  const clientRaw = contract.clients
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { name: string; email: string | null } | null

  const isSigned = contract.status === 'signed'
  const canSign = contract.status === 'sent' || contract.status === 'draft'

  return (
    <div className="min-h-screen bg-[#f5f5f0] print:bg-white">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.business_name && (
              <>
                <div className="w-7 h-7 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {settings.business_name[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-900">{settings.business_name}</span>
                <span className="text-gray-300">·</span>
              </>
            )}
            <span className="text-sm text-gray-500 truncate max-w-[200px]">{contract.title ?? 'Service Agreement'}</span>
          </div>
          <div className="flex items-center gap-3">
            {isSigned && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3.5 3.5L13 4"/>
                </svg>
                Signed
              </span>
            )}
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 pb-32 print:py-0 print:max-w-none print:px-0">

        {/* Signed banner */}
        {isSigned && contract.signed_at && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-6 py-5 flex items-center gap-4 print:hidden">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M3 8l3.5 3.5L13 4"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">This contract has been signed</p>
              <p className="text-xs text-green-600 mt-0.5">Signed on {fmtDate(contract.signed_at)}</p>
            </div>
          </div>
        )}

        {/* Contract document */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:rounded-none print:border-0 print:shadow-none">

          {/* Document header */}
          <div className="px-10 pt-10 pb-6 border-b border-gray-100 print:border-gray-200">
            <div className="flex items-start justify-between gap-6">
              <div>
                {settings?.business_name && (
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {settings.business_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{settings.business_name}</p>
                      {settings.business_email && (
                        <p className="text-xs text-gray-400">{settings.business_email}</p>
                      )}
                    </div>
                  </div>
                )}
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                  {contract.title ?? 'Service Agreement'}
                </h1>
                {client?.name && (
                  <p className="mt-1 text-sm text-gray-500">Prepared for {client.name}</p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-1.5">
                <p className="text-xs text-gray-400">{fmtDate(contract.created_at)}</p>
                {isSigned ? (
                  <span className="inline-block rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wide">
                    Signed
                  </span>
                ) : (
                  <span className="inline-block rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                    Awaiting signature
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contract body */}
          <ContractDocument content={contract.content} />

          {/* Signed record — shown in doc after signing */}
          {isSigned && contract.signed_at && (
            <div className="px-10 py-8 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Execution record</p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Freelancer / Service Provider</p>
                  <p className="text-sm font-medium text-gray-900">{settings?.business_name ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(contract.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Client</p>
                  <p className="text-sm font-medium text-gray-900">{client?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Signed {fmtDate(contract.signed_at)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-10 py-4 border-t border-gray-100 bg-gray-50/50 print:hidden">
            <p className="text-xs text-gray-400 text-center">
              Sent via <span className="font-medium text-gray-500">Soldr</span>
              {settings?.business_email && (
                <> · <a href={`mailto:${settings.business_email}`} className="hover:text-gray-700 transition-colors">{settings.business_email}</a></>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky signing panel */}
      {canSign && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] print:hidden">
          <div className="mx-auto max-w-3xl px-6 py-5">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Ready to sign?</p>
                <p className="text-xs text-gray-400">Type your full name below and check the box to confirm agreement. This constitutes a legally binding electronic signature.</p>
              </div>
              <div className="shrink-0 w-full max-w-md">
                <ContractSignButton
                  token={params.token}
                  contractId={contract.id}
                  clientName={client?.name}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
