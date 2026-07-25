import { useEffect, useState } from 'react'
import { type MenuItem } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

type ForecastItem = {
  itemId: string
  itemName: string
  predictedDemand: number
  suggestedReorderQty: number
  window: string
}

export default function InventoryPanel() {
  const [menuItems, setMenuItems] = useState<(MenuItem & { _id?: string; isAvailable?: boolean })[]>([])
  const [forecasts, setForecasts] = useState<ForecastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await api<any[]>('/api/inventory')
        setMenuItems(items)
      } catch (err) {
        console.error('Failed to fetch inventory:', err)
        const { menuItems: mockItems } = await import('@/data/mock')
        setMenuItems(mockItems)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const socket = getSocket()
    socket.on('inventory:updated', (data: any[]) => {
      setMenuItems(data)
    })
    socket.on('menu:updated', (data: any[]) => {
      setMenuItems([...data].sort((a, b) => a.stockQty - b.stockQty))
    })

    return () => {
      socket.off('inventory:updated')
      socket.off('menu:updated')
    }
  }, [])

  const fetchForecasts = async () => {
    setForecastLoading(true)
    try {
      const data = await api<ForecastItem[]>('/api/ai/forecast')
      setForecasts(data)
    } catch (err) {
      console.error('Failed to fetch forecasts:', err)
    } finally {
      setForecastLoading(false)
    }
  }

  const restock = async (itemId: string, qty: number) => {
    try {
      await api(`/api/inventory/${itemId}/restock`, {
        method: 'PATCH',
        body: JSON.stringify({ qty }),
      })
    } catch (err) {
      console.error('Failed to restock:', err)
    }
  }

  const isAvailable = (item: MenuItem & { isAvailable?: boolean }) => {
    if (typeof item.isAvailable === 'boolean') return item.isAvailable
    return item.stockQty > 0
  }

  const sorted = [...menuItems].sort((a, b) => a.stockQty - b.stockQty)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading inventory...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* Stock list */}
      <div>
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-porcelain/60 mb-4">Stock levels</h3>
        <ul className="space-y-3">
          {sorted.map((item) => {
            const pct = Math.min(100, (item.stockQty / (item.reorderThreshold * 3)) * 100)
            const critical = !isAvailable(item)
            const low = !critical && item.stockQty <= item.reorderThreshold
            return (
              <li key={item._id || item.id} className="bg-steel-dark border border-steel-line rounded-md px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-porcelain text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs ${
                        critical ? 'text-brick' : low ? 'text-saffron' : 'text-porcelain/50'
                      }`}
                    >
                      {item.stockQty} in stock
                    </span>
                    <button
                      onClick={() => restock(item._id || item.id, item.reorderThreshold)}
                      className="font-mono text-[10px] uppercase tracking-wide border border-herb/40 text-herb px-2 py-0.5 rounded-sm hover:bg-herb hover:text-porcelain transition-colors"
                    >
                      +Restock
                    </button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-porcelain/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      critical ? 'bg-brick' : low ? 'bg-saffron' : 'bg-herb'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* AI forecast panel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-porcelain/60">
            Reorder suggestions &middot; AI
          </h3>
          <button
            onClick={fetchForecasts}
            disabled={forecastLoading}
            className="font-mono text-[10px] uppercase tracking-wide border border-saffron/40 text-saffron px-2 py-0.5 rounded-sm hover:bg-saffron hover:text-ink transition-colors disabled:opacity-50"
          >
            {forecastLoading ? 'Analyzing...' : 'Generate'}
          </button>
        </div>
        <div className="space-y-3">
          {forecasts.length === 0 && !forecastLoading && (
            <p className="font-mono text-[11px] text-porcelain/30 leading-relaxed">
              Click "Generate" to get AI-powered reorder suggestions based on order history & stock velocity.
            </p>
          )}
          {forecasts.map((f) => (
            <div key={f.itemId} className="border border-saffron/30 bg-saffron/[0.07] rounded-md px-4 py-3">
              <p className="text-porcelain text-sm font-medium">{f.itemName}</p>
              <p className="font-mono text-xs text-porcelain/50 mt-1">
                predicted demand: {f.predictedDemand} units ({f.window})
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono text-xs text-saffron">
                  reorder {f.suggestedReorderQty} units
                </span>
                <button
                  onClick={() => restock(f.itemId, f.suggestedReorderQty)}
                  className="font-mono text-[11px] uppercase tracking-wide border border-saffron/50 text-saffron px-2.5 py-1 rounded-sm hover:bg-saffron hover:text-ink transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
          {forecasts.length > 0 && (
            <p className="font-mono text-[11px] text-porcelain/30 leading-relaxed pt-1">
              generated from order history &amp; current stock velocity
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
