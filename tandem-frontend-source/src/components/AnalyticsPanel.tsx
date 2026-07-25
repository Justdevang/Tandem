import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type AnalyticsData = {
  revenueByDay: { day: string; amount: number }[]
  topItems: { name: string; orders: number }[]
  weekTotal: number
  totalOrders: number
  avgTicket: number
  tableTurns: string
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api<AnalyticsData>('/api/analytics/summary')
        setData(res)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
        // Fallback to mock data
        const { topItems, revenueByDay } = await import('@/data/mock')
        const weekTotal = revenueByDay.reduce((s, d) => s + d.amount, 0)
        setData({
          revenueByDay,
          topItems,
          weekTotal,
          totalOrders: 486,
          avgTicket: Math.round(weekTotal / 486),
          tableTurns: '3.2x',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading analytics...</p>
      </div>
    )
  }

  const { revenueByDay, topItems, weekTotal, totalOrders, avgTicket, tableTurns } = data
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.amount), 1)
  const maxOrders = Math.max(...topItems.map((d) => d.orders), 1)

  return (
    <div className="space-y-10">
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Revenue, 7d', value: `\u20b9${(weekTotal / 1000).toFixed(1)}k` },
          { label: 'Orders, 7d', value: String(totalOrders) },
          { label: 'Avg ticket', value: `\u20b9${avgTicket}` },
          { label: 'Table turns', value: tableTurns },
        ].map((s) => (
          <div key={s.label} className="border border-steel-line rounded-md px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-porcelain/40">{s.label}</p>
            <p className="font-display text-2xl text-porcelain mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Revenue by day */}
        <div>
          <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-porcelain/60 mb-4">Revenue by day</h3>
          {revenueByDay.length === 0 ? (
            <p className="font-mono text-xs text-porcelain/30">No revenue data yet — place some orders!</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {revenueByDay.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                  <div
                    className="w-full rounded-sm bg-saffron/80"
                    style={{ height: `${(d.amount / maxRevenue) * 100}%` }}
                  />
                  <span className="font-mono text-[10px] text-porcelain/40">{d.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top items */}
        <div>
          <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-porcelain/60 mb-4">Top items, 7d</h3>
          {topItems.length === 0 ? (
            <p className="font-mono text-xs text-porcelain/30">No order data yet.</p>
          ) : (
            <ul className="space-y-3">
              {topItems.map((it) => (
                <li key={it.name}>
                  <div className="flex justify-between font-mono text-xs text-porcelain/60 mb-1">
                    <span>{it.name}</span>
                    <span>{it.orders}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-porcelain/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-herb"
                      style={{ width: `${(it.orders / maxOrders) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
