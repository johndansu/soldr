export function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl w-full px-8 py-8">{children}</div>
    </div>
  )
}
