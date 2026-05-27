'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CommandPalette } from '@/components/search/CommandPalette'

// Primary nav — the core freelance workflow
const NAV_PRIMARY = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2.5" />
        <path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4" />
        <path d="M11.5 3.5a2.5 2.5 0 0 1 0 5" />
        <path d="M15 13.5c0-2-1.5-3.5-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/proposals',
    label: 'Proposals',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" />
        <path d="M9 1v5h5" />
        <path d="M5 9h6M5 12h4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/invoices',
    label: 'Invoices',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="12" height="14" rx="1" />
        <path d="M5 5h6M5 8h6M5 11h4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/time',
    label: 'Time',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.5V8l2.5 2.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/projects',
    label: 'Projects',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="14" height="10" rx="1.5" />
        <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        <path d="M5 9h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/contracts',
    label: 'Contracts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z" />
        <path d="M9 1v5h5" />
        <path d="M5 10h6M5 12.5h3" />
        <path d="M5 7.5l1 1 2-2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/templates',
    label: 'Templates',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="1" width="9" height="11" rx="1" />
        <path d="M5 4h3M5 7h3M5 10h1" />
        <rect x="5" y="4" width="9" height="11" rx="1" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/expenses',
    label: 'Expenses',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.5v7M5.5 6.5c0-.8.9-1.5 2.5-1.5s2.5.7 2.5 1.5S9.6 8 8 8s-2.5.7-2.5 1.5S6.4 11 8 11s2.5-.7 2.5-1.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="9" width="3" height="6" rx="0.5" />
        <rect x="6" y="5" width="3" height="10" rx="0.5" />
        <rect x="11" y="1" width="3" height="14" rx="0.5" />
      </svg>
    ),
  },
]

// Tools — AI utilities, surfaced contextually but accessible here for history
const NAV_TOOLS = [
  {
    href: '/dashboard/nudge',
    label: 'Nudge',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 8c0 2.761-2.239 5-5 5S3 10.761 3 8s2.239-5 5-5" />
        <path d="M9 1l4 2-2 4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/scope',
    label: 'Scope Check',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3 3" />
        <path d="M5.5 7l1.5 1.5 2.5-2.5" />
      </svg>
    ),
  },
]

const SETTINGS = {
  href: '/dashboard/settings',
  label: 'Settings',
  icon: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.93 2.93l1.06 1.06M12.01 12.01l1.06 1.06M2.93 13.07l1.06-1.06M12.01 3.99l1.06-1.06" />
    </svg>
  ),
}

// Mobile bottom nav — 5 most-used destinations
const BOTTOM_NAV = [
  NAV_PRIMARY[0], // Dashboard
  NAV_PRIMARY[2], // Proposals
  NAV_PRIMARY[3], // Invoices
  NAV_PRIMARY[1], // Clients
  SETTINGS,
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setSidebarOpen(false) }, [pathname])
  useEffect(() => { setSearchOpen(false) }, [pathname])

  const openSearch = useCallback(() => setSearchOpen(true), [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const sidebar = (
    <>
      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white/[0.14] to-white/[0.05] border border-white/[0.14] shadow-[0_0_0_3px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5 C4 2.5,4 7,7 7 C10 7,10 11.5,4.5 11.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-bold tracking-tight text-white leading-none">Soldr</span>
            <span className="text-[9px] font-medium text-white/30 leading-none tracking-widest uppercase">AI Freelance OS</span>
          </div>
        </Link>
      </div>

      <div className="h-px mx-4 bg-white/[0.06]" />

      {/* Search trigger */}
      <div className="px-2.5 pt-3 pb-1">
        <button
          type="button"
          onClick={openSearch}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] text-white/35 hover:text-white/60 hover:bg-white/[0.05] transition-colors group"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
          </svg>
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/20 group-hover:text-white/35 transition-colors">⌘K</kbd>
        </button>
      </div>

      {/* Primary nav — flex-1 pushes tools + settings to bottom */}
      <nav className="flex-1 px-2.5 pt-4 pb-2 space-y-px">
        {NAV_PRIMARY.map((item) => <NavLink key={item.href} {...item} />)}
      </nav>

      <div className="h-px mx-4 bg-white/[0.06]" />

      {/* Tools section */}
      <div className="px-2.5 pt-2 pb-1">
        <p className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/20">AI Tools</p>
        <div className="space-y-px">
          {NAV_TOOLS.map((item) => <NavLink key={item.href} {...item} />)}
        </div>
      </div>

      <div className="h-px mx-4 mt-2 bg-white/[0.06]" />

      <div className="px-2.5 py-2">
        <NavLink {...SETTINGS} />
      </div>

      {/* User pill */}
      <div className="px-4 pb-5 pt-1">
        <div className="rounded-lg px-3 py-2.5 flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06]">
          <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-[9px] font-bold text-white/70">
            W
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/50 truncate leading-none">My workspace</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-[#0a0a0a] overflow-y-auto
          transition-transform duration-200 ease-in-out will-change-transform
          lg:static lg:w-60 lg:translate-x-0 lg:z-auto lg:shrink-0
          print:hidden
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        {sidebar}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 4h12M2 8h12M2 12h8" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0a0a0a] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5 C4 2.5,4 7,7 7 C10 7,10 11.5,4.5 11.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-gray-900">Soldr</span>
          </Link>
          <button
            type="button"
            onClick={openSearch}
            className="ml-auto p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden ai-bg flex flex-col pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="shrink-0 lg:hidden fixed bottom-0 inset-x-0 z-10 bg-white border-t border-gray-100 flex print:hidden">
          {BOTTOM_NAV.map((item) => (
            <BottomNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-lg px-3 py-[7px] text-[13px] transition-colors duration-100 ${
        active
          ? 'bg-white/[0.09] text-white font-medium'
          : 'text-white/40 hover:text-white/75 hover:bg-white/[0.05] font-normal'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-white/30'}`}>{icon}</span>
        {label}
      </div>
      {active && <span className="w-1 h-1 rounded-full bg-white/50 shrink-0" />}
    </Link>
  )
}

function BottomNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
        active ? 'text-gray-900' : 'text-gray-400'
      }`}
    >
      <span className={`transition-colors ${active ? 'text-gray-900' : 'text-gray-400'}`}>{icon}</span>
      <span className="leading-none">{label.split(' ')[0]}</span>
    </Link>
  )
}
