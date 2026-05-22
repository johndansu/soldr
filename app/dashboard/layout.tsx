'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 shrink-0 bg-gray-950 flex flex-col">
        <div className="px-5 py-5">
          <span className="text-white font-semibold text-base tracking-tight">Soldr</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/proposals">Proposals</NavLink>
          <NavLink href="/dashboard/nudge">Payment Nudge</NavLink>
          <NavLink href="/dashboard/scope">Scope Creep</NavLink>
          <NavLink href="/dashboard/clients">Clients</NavLink>
          <NavLink href="/dashboard/invoices">Invoices</NavLink>
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <NavLink href="/dashboard/settings">Settings</NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}
