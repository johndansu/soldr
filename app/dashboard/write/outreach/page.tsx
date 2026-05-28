import { PageContent } from '@/components/ui/PageContent'
import { WritingTool } from '@/components/write/WritingTool'

export default function OutreachPage() {
  return (
    <PageContent>
      <WritingTool
        tool="outreach"
        title="Cold outreach"
        description="Draft a first-contact email to a new lead."
        endpoint="/api/ai/outreach"
        fields={[
          { key: 'leadName',    label: 'Lead name',             placeholder: 'Sarah Chen',                         type: 'text',     required: true },
          { key: 'company',     label: 'Company',               placeholder: 'Acme Inc.',                          type: 'text' },
          { key: 'whatYouDo',  label: 'What you do',           placeholder: 'I build Webflow sites for SaaS startups', type: 'text', required: true },
          { key: 'whyReaching',label: 'Why you\'re reaching out', placeholder: 'I noticed their pricing page is hard to scan — I redesigned something similar for Clerk last year', type: 'textarea', required: true },
          { key: 'credential', label: 'Credential or result',  placeholder: 'Increased Clerk\'s trial signups by 22% in 6 weeks', type: 'text', hint: 'Optional — include a specific result or social proof.' },
        ]}
        parseOutput={(data: unknown) => {
          const d = data as { emails?: { variant: string; subject: string; body: string }[] }
          return (d.emails ?? []).map((e) => ({
            label: e.variant === 'concise' ? 'Concise version' : 'Fuller version',
            content: `Subject: ${e.subject}\n\n${e.body}`,
          }))
        }}
      />
    </PageContent>
  )
}
