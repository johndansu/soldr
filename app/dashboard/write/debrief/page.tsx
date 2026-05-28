import { PageContent } from '@/components/ui/PageContent'
import { WritingTool } from '@/components/write/WritingTool'

export default function DebriefPage() {
  return (
    <PageContent>
      <WritingTool
        tool="debrief"
        title="Project debrief"
        description="Turn a completed project into a portfolio case study."
        endpoint="/api/ai/debrief"
        fields={[
          { key: 'clientName',   label: 'Client',              placeholder: 'Paystack',                                  type: 'text',     required: true },
          { key: 'projectName',  label: 'Project name',        placeholder: 'Developer docs redesign',                  type: 'text' },
          { key: 'whatYouBuilt', label: 'What you built',      placeholder: 'Redesigned their docs site — new IA, custom components, dark mode', type: 'textarea', required: true },
          { key: 'outcomes',     label: 'Results / outcomes',  placeholder: 'Page views up 40%, support tickets down 18% in 60 days', type: 'textarea', hint: 'Be specific. Numbers make the case study.' },
          { key: 'duration',     label: 'Duration',            placeholder: '6 weeks',                                  type: 'text' },
        ]}
        parseOutput={(data: unknown) => {
          const d = data as { content?: string }
          return [{ label: 'Case study', content: d.content ?? '' }]
        }}
      />
    </PageContent>
  )
}
