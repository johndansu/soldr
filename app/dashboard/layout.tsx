import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex h-full flex-col">
          <div className="px-4 py-5">
            <span className="text-lg font-bold text-gray-900">Soldr</span>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-2">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard/proposals">Proposals</NavLink>
            <NavLink href="/dashboard/nudge">Payment Nudge</NavLink>
            <NavLink href="/dashboard/clients">Clients</NavLink>
            <NavLink href="/dashboard/invoices">Invoices</NavLink>
          </nav>

          <div className="border-t border-gray-200 px-2 py-2">
            <NavLink href="/dashboard/settings">Settings</NavLink>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  )
}
