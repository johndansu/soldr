import { PageContent } from '@/components/ui/PageContent'
import { WritingTool } from '@/components/write/WritingTool'

export default function BioPage() {
  return (
    <PageContent>
      <WritingTool
        tool="bio"
        title="Bio & services"
        description="Generate a short bio, full bio, and services blurb for your profile."
        endpoint="/api/ai/bio"
        fields={[
          { key: 'name',        label: 'Your name',             placeholder: 'Tunde Adeyemi',                                           type: 'text',     required: true },
          { key: 'whatYouDo',  label: 'What you do',           placeholder: 'Brand identity and web design for early-stage startups',  type: 'text',     required: true },
          { key: 'specialties',label: 'Specialties / industries', placeholder: 'Fintech, B2B SaaS, healthcare — Figma, Webflow, Framer', type: 'textarea' },
          { key: 'experience', label: 'Experience / credentials', placeholder: '7 years, ex-Flutterwave design lead, 40+ brands shipped', type: 'textarea' },
          { key: 'tone',       label: 'Tone',                   placeholder: 'Confident and warm, not corporate',                       type: 'text',     hint: 'Optional — defaults to warm-professional.' },
        ]}
        parseOutput={(data: unknown) => {
          const d = data as { sections?: { type: string; content: string }[] }
          const labels: Record<string, string> = {
            short_bio:      'Short bio (40–60 words)',
            full_bio:       'Full bio (120–160 words)',
            services_blurb: 'Services blurb',
          }
          return (d.sections ?? []).map((s) => ({
            label: labels[s.type] ?? s.type,
            content: s.content,
          }))
        }}
      />
    </PageContent>
  )
}
