import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ExpenseReportData {
  byCurrency: Record<string, number>
  byCategory: { category: string; total: number; currency: string }[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount, currency, category')
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byCurrency: Record<string, number> = {}
  const catMap = new Map<string, number>()
  const catCurrencyMap = new Map<string, string>()

  for (const e of expenses ?? []) {
    const cur = e.currency ?? 'NGN'
    byCurrency[cur] = (byCurrency[cur] ?? 0) + Number(e.amount)

    const key = `${cur}::${e.category}`
    catMap.set(key, (catMap.get(key) ?? 0) + Number(e.amount))
    catCurrencyMap.set(key, cur)
  }

  const byCategory = Array.from(catMap.entries())
    .map(([key, total]) => ({
      category: key.split('::')[1],
      total,
      currency: catCurrencyMap.get(key)!,
    }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ byCurrency, byCategory } satisfies ExpenseReportData)
}
