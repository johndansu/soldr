import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵' }
function sym(c: string) { return SYMBOLS[c] ?? c }
function fmt(n: number, currency: string) {
  return `${sym(currency)}${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const s = StyleSheet.create({
  page:          { fontFamily: 'Helvetica', fontSize: 9, color: '#111', padding: 48, backgroundColor: '#fff' },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  value:         { fontSize: 9, color: '#111' },
  bold:          { fontFamily: 'Helvetica-Bold' },
  divider:       { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 16 },
  amountBox:     { backgroundColor: '#111', borderRadius: 6, padding: 16, minWidth: 160, alignItems: 'flex-end' },
  amountBoxRed:  { backgroundColor: '#dc2626', borderRadius: 6, padding: 16, minWidth: 160, alignItems: 'flex-end' },
  amountBoxGreen:{ backgroundColor: '#16a34a', borderRadius: 6, padding: 16, minWidth: 160, alignItems: 'flex-end' },
  amountLabel:   { fontSize: 7, color: '#fff', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  amountValue:   { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#fff' },
  amountSub:     { fontSize: 7, color: '#fff', opacity: 0.6, marginTop: 4 },
  tableHead:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6, marginBottom: 4 },
  tableHeadCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow:      { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableCell:     { fontSize: 9, color: '#333' },
  totalsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  totalsLabel:   { fontSize: 9, color: '#666' },
  totalsValue:   { fontSize: 9, color: '#333' },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ddd' },
  totalLabel:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111' },
  totalValue:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111' },
  footer:        { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  footerText:    { fontSize: 7, color: '#bbb' },
  section:       { marginBottom: 8 },
})

interface LineItem { description: string; qty: number; rate: number }
interface Payment  { amount: number; paid_date: string; notes: string | null }

interface Props {
  invoice: {
    invoice_number: string | null
    amount: number
    currency: string
    due_date: string
    created_at: string
    status: string
    line_items: LineItem[] | null
    tax_rate: number | null
    discount: number | null
    discount_type: string | null
    notes: string | null
    description: string | null
  }
  business: {
    business_name: string | null
    business_email: string | null
    business_phone: string | null
    business_address: string | null
    bank_details: string | null
  }
  client: { name: string; email: string | null } | null
  payments: Payment[]
}

export function InvoicePDF({ invoice, business, client, payments }: Props) {
  const lineItems = invoice.line_items ?? []
  const hasLineItems = lineItems.length > 0
  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const discountAmt = invoice.discount_type === 'percentage'
    ? subtotal * (invoice.discount ?? 0) / 100
    : (invoice.discount ?? 0)
  const afterDiscount = subtotal - discountAmt
  const taxAmt = afterDiscount * (invoice.tax_rate ?? 0) / 100
  const total = hasLineItems ? afterDiscount + taxAmt : invoice.amount

  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = invoice.status === 'unpaid' && invoice.due_date < today
  const displayStatus = isOverdue ? 'overdue' : invoice.status

  const boxStyle = displayStatus === 'paid' ? s.amountBoxGreen
    : displayStatus === 'overdue' ? s.amountBoxRed
    : s.amountBox

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={[s.row, { marginBottom: 24 }]}>
          <View>
            {business.business_name && (
              <Text style={[s.bold, { fontSize: 14, marginBottom: 6 }]}>{business.business_name}</Text>
            )}
            {business.business_email   && <Text style={{ color: '#666', fontSize: 8, marginBottom: 2 }}>{business.business_email}</Text>}
            {business.business_phone   && <Text style={{ color: '#666', fontSize: 8, marginBottom: 2 }}>{business.business_phone}</Text>}
            {business.business_address && <Text style={{ color: '#666', fontSize: 8 }}>{business.business_address}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
              <Text style={s.label}>Invoice</Text>
              <Text style={[s.bold, { fontSize: 13 }]}>{invoice.invoice_number ?? '—'}</Text>
            </View>
            <View style={boxStyle}>
              <Text style={s.amountLabel}>Amount due</Text>
              <Text style={s.amountValue}>{fmt(total, invoice.currency)}</Text>
              <Text style={s.amountSub}>Due {fmtDate(invoice.due_date)}</Text>
            </View>
            <Text style={[s.bold, { fontSize: 7, textTransform: 'uppercase', color: displayStatus === 'paid' ? '#16a34a' : displayStatus === 'overdue' ? '#dc2626' : '#666' }]}>
              {displayStatus}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Bill to + dates */}
        <View style={[s.row, { marginBottom: 20 }]}>
          <View style={s.section}>
            <Text style={s.label}>Billed to</Text>
            <Text style={[s.value, s.bold]}>{client?.name ?? '—'}</Text>
            {client?.email && <Text style={{ color: '#666', fontSize: 8 }}>{client.email}</Text>}
          </View>
          <View style={s.section}>
            <Text style={s.label}>Invoice date</Text>
            <Text style={s.value}>{fmtDate(invoice.created_at)}</Text>
          </View>
          <View style={s.section}>
            <Text style={s.label}>Due date</Text>
            <Text style={[s.value, s.bold, { color: isOverdue ? '#dc2626' : '#111' }]}>{fmtDate(invoice.due_date)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items */}
        <View style={{ marginBottom: 16 }}>
          {hasLineItems ? (
            <>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, { flex: 1 }]}>Description</Text>
                <Text style={[s.tableHeadCell, { width: 30, textAlign: 'right' }]}>Qty</Text>
                <Text style={[s.tableHeadCell, { width: 70, textAlign: 'right' }]}>Rate</Text>
                <Text style={[s.tableHeadCell, { width: 80, textAlign: 'right' }]}>Amount</Text>
              </View>
              {lineItems.map((item, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={[s.tableCell, { flex: 1 }]}>{item.description || '—'}</Text>
                  <Text style={[s.tableCell, { width: 30, textAlign: 'right' }]}>{item.qty}</Text>
                  <Text style={[s.tableCell, { width: 70, textAlign: 'right' }]}>{fmt(item.rate, invoice.currency)}</Text>
                  <Text style={[s.tableCell, s.bold, { width: 80, textAlign: 'right' }]}>{fmt(item.qty * item.rate, invoice.currency)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ color: '#444', fontSize: 9 }}>{invoice.description ?? '—'}</Text>
          )}
        </View>

        {/* Totals */}
        <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
          <View style={{ width: 200 }}>
            {hasLineItems && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Subtotal</Text>
                <Text style={s.totalsValue}>{fmt(subtotal, invoice.currency)}</Text>
              </View>
            )}
            {discountAmt > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Discount{invoice.discount_type === 'percentage' ? ` (${invoice.discount}%)` : ''}</Text>
                <Text style={[s.totalsValue, { color: '#dc2626' }]}>− {fmt(discountAmt, invoice.currency)}</Text>
              </View>
            )}
            {taxAmt > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Tax ({invoice.tax_rate}%)</Text>
                <Text style={s.totalsValue}>+ {fmt(taxAmt, invoice.currency)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{fmt(total, invoice.currency)}</Text>
            </View>
            {totalPaid > 0 && totalPaid < total && (
              <View style={[s.totalsRow, { marginTop: 6 }]}>
                <Text style={{ fontSize: 8, color: '#16a34a' }}>Paid so far</Text>
                <Text style={{ fontSize: 8, color: '#16a34a' }}>{fmt(totalPaid, invoice.currency)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes + bank details */}
        {(invoice.notes || business.bank_details) && (
          <>
            <View style={s.divider} />
            <View style={s.row}>
              {invoice.notes && (
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={s.label}>Notes</Text>
                  <Text style={{ color: '#555', fontSize: 8, lineHeight: 1.5 }}>{invoice.notes}</Text>
                </View>
              )}
              {business.bank_details && (
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Payment details</Text>
                  <Text style={{ color: '#555', fontSize: 8, lineHeight: 1.5 }}>{business.bank_details}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{invoice.invoice_number ? `${invoice.invoice_number} · ` : ''}Generated with Soldr</Text>
          <Text style={s.footerText}>{fmtDate(new Date().toISOString())}</Text>
        </View>

      </Page>
    </Document>
  )
}
