import { PageContent } from './PageContent'

export function PageSkeleton() {
  return (
    <PageContent>
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-36 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-9 w-28 rounded-md bg-gray-200" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 last:border-0">
              <div className="h-4 flex-1 rounded bg-gray-100" />
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </PageContent>
  )
}

export function FormSkeleton() {
  return (
    <PageContent>
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-32 w-full rounded-md bg-gray-100" />
          </div>
          <div className="h-9 w-28 rounded-md bg-gray-200" />
        </div>
      </div>
    </PageContent>
  )
}
