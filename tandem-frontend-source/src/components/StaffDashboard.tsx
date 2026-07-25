import { useState } from 'react'
import TicketRail from '@/components/TicketRail'
import TablesFloor from '@/components/TablesFloor'
import InventoryPanel from '@/components/InventoryPanel'
import AnalyticsPanel from '@/components/AnalyticsPanel'

const tabs = [
  { key: 'tickets', label: 'Tickets' },
  { key: 'tables', label: 'Tables' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'analytics', label: 'Analytics' },
] as const

type TabKey = (typeof tabs)[number]['key']

export default function StaffDashboard() {
  const [tab, setTab] = useState<TabKey>('tickets')

  return (
    <div className="min-h-full bg-ink text-porcelain">
      <header className="border-b border-steel-line px-6 md:px-12 pt-8 pb-5">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.25em] text-porcelain/40 uppercase">Kitchen &middot; Floor</p>
            <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-1">Tandem</h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] tracking-[0.2em] text-porcelain/40 uppercase">2 items 86'd</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brick opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brick"></span>
              </span>
              <span className="text-xs text-porcelain/50">auto-synced to menu</span>
            </div>
          </div>
        </div>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-wide rounded-sm transition-colors ${
                tab === t.key
                  ? 'bg-porcelain text-ink'
                  : 'text-porcelain/50 hover:text-porcelain hover:bg-porcelain/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-6 md:px-12 py-8">
        {tab === 'tickets' && <TicketRail />}
        {tab === 'tables' && <TablesFloor />}
        {tab === 'inventory' && <InventoryPanel />}
        {tab === 'analytics' && <AnalyticsPanel />}
      </main>
    </div>
  )
}
