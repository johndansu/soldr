import { ProposalDrafter } from '@/components/proposal/ProposalDrafter'

export default function NewProposalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Proposal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste a client brief and get a ready-to-send proposal in seconds.
        </p>
      </div>

      <ProposalDrafter />
    </div>
  )
}
