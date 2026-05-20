import { NudgeGenerator } from '@/components/nudge/NudgeGenerator'

export default function NudgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Nudge</h1>
        <p className="mt-1 text-sm text-gray-500">
          Describe the invoice and client — get three ready-to-send follow-up emails.
        </p>
      </div>
      <NudgeGenerator />
    </div>
  )
}
