import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 9, color: '#111', padding: 56, backgroundColor: '#fff', lineHeight: 1.5 },
  title:      { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  subtitle:   { fontSize: 9, color: '#666', textAlign: 'center', marginBottom: 32 },
  h2:         { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.5, color: '#333', marginTop: 20, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  body:       { fontSize: 9, color: '#333', lineHeight: 1.6 },
  bold:       { fontFamily: 'Helvetica-Bold' },
  divider:    { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 12 },
  footer:     { marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#bbb' },
})

// Parse markdown into sections: split on ## headings
function parseMarkdown(md: string): { heading: string | null; body: string }[] {
  const sections: { heading: string | null; body: string }[] = []
  const lines = md.split('\n')
  let currentHeading: string | null = null
  let currentBody: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentBody.length > 0 || currentHeading !== null) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = line.replace(/^## /, '').trim()
      currentBody = []
    } else if (line.startsWith('# ')) {
      if (currentBody.length > 0 || currentHeading !== null) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = null
      currentBody = [line.replace(/^# /, '').trim()]
    } else {
      currentBody.push(line)
    }
  }

  if (currentBody.length > 0 || currentHeading !== null) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  return sections
}

// Strip markdown formatting for plain text rendering
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, (m) => m)
    .replace(/`(.+?)`/g, '$1')
    .replace(/_{2}(.+?)_{2}/g, '$1')
    .trim()
}

interface Props {
  title: string
  content: string
  status: string
  signed_at: string | null
  freelancerName: string | null
  clientName: string | null
}

export function ContractPDF({ title, content, status, signed_at, freelancerName, clientName }: Props) {
  const sections = parseMarkdown(content)
  const signedDate = signed_at
    ? new Date(signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>

        {/* Title */}
        <Text style={s.title}>{title || 'Service Agreement'}</Text>
        <Text style={s.subtitle}>
          {status === 'signed' && signedDate ? `Signed ${signedDate}` : `Status: ${status}`}
        </Text>

        <View style={s.divider} />

        {/* Sections */}
        {sections.map((sec, i) => (
          <View key={i} wrap={false}>
            {sec.heading && <Text style={s.h2}>{sec.heading}</Text>}
            {sec.body ? (
              <Text style={s.body}>{stripMarkdown(sec.body)}</Text>
            ) : null}
          </View>
        ))}

        {/* Signature block if signed */}
        {status === 'signed' && (signed_at || clientName || freelancerName) && (
          <>
            <View style={[s.divider, { marginTop: 24 }]} />
            <View style={s.h2}>
              <Text>Execution</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Freelancer</Text>
                <Text style={[s.bold, { fontSize: 10 }]}>{freelancerName ?? '—'}</Text>
                {signedDate && <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{signedDate}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Client</Text>
                <Text style={[s.bold, { fontSize: 10 }]}>{clientName ?? '—'}</Text>
                {signedDate && <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{signedDate}</Text>}
              </View>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Generated with Soldr</Text>
          <Text style={s.footerText}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>

      </Page>
    </Document>
  )
}
