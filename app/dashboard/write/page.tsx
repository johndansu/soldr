import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageContent } from '@/components/ui/PageContent'
import { DeleteButton } from '@/components/ui/DeleteButton'

const TOOLS = [
  {
    href: '/dashboard/write/outreach',
    label: 'Cold outreach',
    desc: 'First-contact emails for new leads.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2L2 7l5 2 2 5 5-12z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/write/debrief',
    label: 'Project debrief',
    desc: 'Turn a completed project into a portfolio case study.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"/>
        <path d="M9 1v5h5"/><path d="M5 9h6M5 12h4"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/write/testimonial',
    label: 'Testimonial request',
    desc: 'Ask a past client for a review without the awkwardness.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/write/bio',
    label: 'Bio & services',
    desc: 'Short bio, full bio, and services blurb for your profile.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2.5"/>
        <path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4"/>
        <path d="M12 7l2 2-2 2M10 9h4"/>
      </svg>
    ),
  },
]

const TOOL_LABELS: Record<string, string> = {
  outreach: 'Cold outreach', debrief: 'Project debrief',
  testimonial: 'Testimonial request', bio: 'Bio & services',
}

export default async function WritePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recent } = await supabase
    .from('writing_results')
    .select('id, tool, title, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <PageContent>
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Write</h1>
          <p className="mt-0.5 text-sm text-gray-400">AI writing tools for freelancers.</p>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-start gap-4 hover:border-gray-300 hover:shadow transition-all group">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                {t.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent */}
        {(recent?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recent</p>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
              {recent!.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3.5 gap-3 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TOOL_LABELS[r.tool] ?? r.tool} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton endpoint={`/api/write/${r.id}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContent>
  )
}
