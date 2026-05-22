import { ScopeDetector } from '@/components/scope/ScopeDetector'

export default function ScopePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scope Creep Detector</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste what was agreed and what the client just asked — get a verdict and a ready-to-send reply.
        </p>
      </div>
      <ScopeDetector />
    </div>
  )
}
