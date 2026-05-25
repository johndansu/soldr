import Link from 'next/link'

interface Props {
  hasClient: boolean
  hasProposal: boolean
  hasInvoice: boolean
}

const steps = [
  {
    key: 'client' as const,
    num: '1',
    title: 'Add your first client',
    desc: 'Everything starts with who you work for.',
    href: '/dashboard/clients/new',
    cta: 'Add client',
  },
  {
    key: 'proposal' as const,
    num: '2',
    title: 'Write a proposal',
    desc: 'Win the project before the work begins.',
    href: '/dashboard/proposals/new',
    cta: 'New proposal',
  },
  {
    key: 'invoice' as const,
    num: '3',
    title: 'Send your first invoice',
    desc: 'Get paid for the work you do.',
    href: '/dashboard/invoices/new',
    cta: 'New invoice',
  },
]

export function OnboardingBanner({ hasClient, hasProposal, hasInvoice }: Props) {
  const done = { client: hasClient, proposal: hasProposal, invoice: hasInvoice }
  const allDone = hasClient && hasProposal && hasInvoice
  if (allDone) return null

  const completedCount = [hasClient, hasProposal, hasInvoice].filter(Boolean).length

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Get started with Soldr</p>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} of 3 steps complete</p>
        </div>
        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {steps.map((step) => {
          const isDone = done[step.key]
          return (
            <div key={step.key} className={`flex items-center gap-4 px-5 py-4 ${isDone ? 'opacity-50' : ''}`}>
              {/* Check / number */}
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone
                  ? 'bg-gray-900 text-white'
                  : 'border-2 border-gray-200 text-gray-400'
              }`}>
                {isDone
                  ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>
                  : step.num
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{step.title}</p>
                {!isDone && <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>}
              </div>

              {/* CTA */}
              {!isDone && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {step.cta} →
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
