import { PageContent } from '@/components/ui/PageContent'
import { IncomeReport } from '@/components/reports/IncomeReport'
import { PrintButton } from '@/components/ui/PrintButton'

export default function ReportsPage() {
  return (
    <PageContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Income report</h1>
            <p className="mt-0.5 text-sm text-gray-400">Billed vs collected, by client and by month.</p>
          </div>
          <PrintButton />
        </div>

        <IncomeReport />
      </div>
    </PageContent>
  )
}
