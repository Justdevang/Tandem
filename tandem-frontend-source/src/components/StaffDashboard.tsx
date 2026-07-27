import { useState, useEffect } from 'react'
import { Flame } from 'lucide-react'
import TicketRail from '@/components/TicketRail'
import TablesFloor from '@/components/TablesFloor'
import InventoryPanel from '@/components/InventoryPanel'
import AnalyticsPanel from '@/components/AnalyticsPanel'
import BillingHistoryPanel from '@/components/BillingHistoryPanel'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

const tabs = [
  { key: 'tickets', label: 'Tickets' },
  { key: 'tables', label: 'Tables' },
  { key: 'billing', label: 'Billing History' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'analytics', label: 'Analytics' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function StaffDashboard() {
  const [tab, setTab] = useState<TabKey>('tickets')
  const [kitchenLoad, setKitchenLoad] = useState<{
    loadScore: number
    loadLevel: 'Low' | 'Medium' | 'High'
    activeTicketCount: number
    isManualBusy: boolean
  }>({ loadScore: 15, loadLevel: 'Low', activeTicketCount: 0, isManualBusy: false })

  useEffect(() => {
    api<any>('/api/kitchen/load').then((res) => {
      if (res) setKitchenLoad(res)
    }).catch(() => {})

    const socket = getSocket()
    socket.on('kitchen:load-updated', (data: any) => {
      if (data) setKitchenLoad(data)
    })

    return () => {
      socket.off('kitchen:load-updated')
    }
  }, [])

  const toggleManualBusy = async () => {
    const nextState = !kitchenLoad.isManualBusy
    try {
      const res = await api<any>('/api/kitchen/load/override', {
        method: 'POST',
        body: JSON.stringify({ isManualBusy: nextState }),
      })
      if (res) setKitchenLoad(res)
    } catch (err) {
      console.error('Failed to toggle manual busy override:', err)
    }
  }

  return (
    <div className="min-h-full bg-ink text-porcelain">
      <header className="border-b border-steel-line px-6 md:px-12 pt-8 pb-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.25em] text-porcelain/40 uppercase">Kitchen &middot; Floor &middot; Queue Load</p>
              <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-1">Tandem Staff</h1>
            </div>

            {/* Kitchen Load Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Live Load Badge */}
              <div className="font-mono text-xs bg-porcelain/5 border border-porcelain/15 px-3 py-1.5 rounded flex items-center gap-2">
                <span className="text-porcelain/50 uppercase tracking-wider text-[10px]">Queue Load:</span>
                <span className={`font-bold uppercase ${
                  kitchenLoad.loadLevel === 'High' ? 'text-brick animate-pulse' : kitchenLoad.loadLevel === 'Medium' ? 'text-saffron' : 'text-herb'
                }`}>
                  {kitchenLoad.loadLevel} ({kitchenLoad.loadScore}%)
                </span>
              </div>

              {/* Manager Busy Override Toggle */}
              <button
                onClick={toggleManualBusy}
                title="Manually force Busy Mode during rush hours"
                className={`font-mono text-xs px-3 py-1.5 rounded transition-all cursor-pointer border font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
                  kitchenLoad.isManualBusy
                    ? 'bg-brick text-porcelain border-brick shadow-md animate-pulse'
                    : 'bg-porcelain/10 text-porcelain/70 border-porcelain/20 hover:text-porcelain hover:bg-porcelain/20'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Rush Mode: {kitchenLoad.isManualBusy ? 'ON (Forced)' : 'AUTO'}</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-1.5 border-b border-steel-line/40 pb-0.5 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wide rounded-t-md transition-all ${
                  tab === t.key
                    ? 'bg-porcelain text-ink font-bold shadow-sm'
                    : 'text-porcelain/60 hover:text-porcelain hover:bg-porcelain/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
        {tab === 'tickets' && <TicketRail />}
        {tab === 'tables' && <TablesFloor />}
        {tab === 'billing' && <BillingHistoryPanel />}
        {tab === 'inventory' && <InventoryPanel />}
        {tab === 'analytics' && <AnalyticsPanel />}
      </main>
    </div>
  )
}
