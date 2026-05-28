import { PageContent } from '@/components/ui/PageContent'
import { WritingTool } from '@/components/write/WritingTool'

export default function TestimonialPage() {
  return (
    <PageContent>
      <WritingTool
        tool="testimonial"
        title="Testimonial request"
        description="Ask a past client for a review without the awkwardness."
        endpoint="/api/ai/testimonial"
        fields={[
          { key: 'clientName',          label: 'Client name',           placeholder: 'Tunde',                                              type: 'text',     required: true },
          { key: 'projectDescription',  label: 'Project',               placeholder: 'Brand identity + website for his law firm, launched March', type: 'textarea', required: true },
          { key: 'platform',            label: 'Where to leave review', placeholder: 'LinkedIn, Google, or reply to this email',           type: 'text',     hint: 'Optional — leave blank to keep it general.' },
        ]}
        parseOutput={(data: unknown) => {
          const d = data as { messages?: { channel: string; subject?: string; body: string }[] }
          return (d.messages ?? []).map((m) => ({
            label: m.channel === 'email' ? 'Email' : 'Short message (WhatsApp / DM)',
            content: m.channel === 'email' && m.subject ? `Subject: ${m.subject}\n\n${m.body}` : m.body,
          }))
        }}
      />
    </PageContent>
  )
}
