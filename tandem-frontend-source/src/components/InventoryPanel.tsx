import { useEffect, useState, useMemo } from 'react'
import { Sparkles, Search } from 'lucide-react'
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

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all')
  const [sortBy, setSortBy] = useState<'stock-asc' | 'stock-desc' | 'name-asc' | 'name-desc' | 'reorder-desc'>('stock-asc')

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
      setMenuItems(data)
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

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach((m) => {
      if (m.category) set.add(m.category)
    })
    return ['all', ...Array.from(set)]
  }, [menuItems])

  // Filtered and sorted inventory items
  const filteredAndSorted = useMemo(() => {
    return menuItems
      .filter((item) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const nameMatch = item.name.toLowerCase().includes(q)
          const catMatch = item.category?.toLowerCase().includes(q)
          if (!nameMatch && !catMatch) return false
        }

        // Category filter
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false
        }

        // Status filter
        const available = isAvailable(item)
        const low = available && item.stockQty <= item.reorderThreshold
        if (statusFilter === 'out' && available) return false
        if (statusFilter === 'low' && !low && available) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'stock-asc') return a.stockQty - b.stockQty
        if (sortBy === 'stock-desc') return b.stockQty - a.stockQty
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        if (sortBy === 'reorder-desc') return b.reorderThreshold - a.reorderThreshold
        return 0
      })
  }, [menuItems, searchQuery, categoryFilter, statusFilter, sortBy])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading inventory...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header & AI Forecast Generator Row */}
      <div className="flex items-center justify-between border-b border-steel-line pb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-porcelain/60">Inventory & Stock Levels</h3>
          <p className="text-xs text-porcelain/40 mt-0.5">Real-time stock quantities & reorder thresholds</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchForecasts}
            disabled={forecastLoading}
            className="text-xs uppercase tracking-wide border border-saffron/40 text-saffron px-3 py-1.5 rounded transition-all hover:bg-saffron hover:text-ink cursor-pointer disabled:opacity-50 font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{forecastLoading ? 'Analyzing...' : 'AI Reorder Forecast'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Search Controls */}
      <div className="bg-paper/10 border border-porcelain/10 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or category..."
              className="w-full bg-ink/50 border border-porcelain/20 rounded pl-8 pr-7 py-1.5 text-porcelain focus:outline-none focus:border-saffron text-xs placeholder:text-porcelain/40"
            />
            <Search className="w-3.5 h-3.5 text-porcelain/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-porcelain/40 hover:text-porcelain text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-porcelain/50 text-[11px]">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-ink/50 border border-porcelain/20 rounded px-2.5 py-1.5 text-porcelain text-xs focus:outline-none focus:border-saffron capitalize cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-ink text-porcelain capitalize">
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-porcelain/50 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-ink/50 border border-porcelain/20 rounded px-2.5 py-1.5 text-porcelain text-xs focus:outline-none focus:border-saffron cursor-pointer"
            >
              <option value="all" className="bg-ink text-porcelain">All Stock Levels</option>
              <option value="low" className="bg-ink text-saffron">Low Stock Only</option>
              <option value="out" className="bg-ink text-brick">Out of Stock (86'd)</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-porcelain/50 text-[11px]">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-ink/50 border border-saffron/40 text-saffron font-semibold rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-saffron cursor-pointer"
          >
            <option value="stock-asc" className="bg-ink text-porcelain">Lowest Stock First ↑</option>
            <option value="stock-desc" className="bg-ink text-porcelain">Highest Stock First ↓</option>
            <option value="name-asc" className="bg-ink text-porcelain">Name (A-Z)</option>
            <option value="name-desc" className="bg-ink text-porcelain">Name (Z-A)</option>
            <option value="reorder-desc" className="bg-ink text-porcelain">Reorder Threshold ↓</option>
          </select>

          <span className="text-porcelain/40 text-[11px] ml-2">
            ({filteredAndSorted.length} items)
          </span>
        </div>
      </div>

      {/* AI Reorder Suggestions Alert Box (If Generated) */}
      {forecasts.length > 0 && (
        <div className="bg-saffron/10 border border-saffron/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-saffron tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Predictive Reorder Recommendations
            </p>
            <span className="text-[10px] text-porcelain/40">Based on sales velocity</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {forecasts.map((f) => (
              <div key={f.itemId} className="bg-ink/40 border border-saffron/30 rounded-lg p-3 space-y-2">
                <p className="text-porcelain text-xs font-semibold">{f.itemName}</p>
                <p className="text-[11px] text-porcelain/60">Predicted demand: {f.predictedDemand} units</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-saffron">+{f.suggestedReorderQty} units</span>
                  <button
                    onClick={() => restock(f.itemId, f.suggestedReorderQty)}
                    className="text-[10px] uppercase font-bold bg-saffron text-ink px-2 py-1 rounded hover:bg-saffron-deep transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Column Side-by-Side Stock Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-porcelain/20 rounded-xl text-porcelain/40 text-xs">
          <Search className="w-6 h-6 mx-auto mb-2 text-porcelain/30" />
          <p>No inventory items match your current filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
              setStatusFilter('all')
            }}
            className="mt-3 text-saffron underline hover:text-saffron-deep cursor-pointer"
          >
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredAndSorted.map((item) => {
            const pct = Math.min(100, (item.stockQty / (item.reorderThreshold * 3)) * 100)
            const critical = !isAvailable(item)
            const low = !critical && item.stockQty <= item.reorderThreshold

            return (
              <div
                key={item._id || item.id}
                className={`bg-steel-dark border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:scale-[1.02] shadow-sm relative ${
                  critical
                    ? 'border-brick/50 bg-brick/5'
                    : low
                    ? 'border-saffron/50 bg-saffron/5'
                    : 'border-steel-line'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-porcelain text-sm font-semibold leading-snug line-clamp-1">{item.name}</h4>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-porcelain/10 text-porcelain/60 shrink-0">
                      {item.category}
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className={`text-lg font-bold ${critical ? 'text-brick' : low ? 'text-saffron' : 'text-herb'}`}>
                      {item.stockQty} <span className="text-xs font-normal text-porcelain/60">in stock</span>
                    </p>
                    <p className="text-[10px] text-porcelain/40 mt-0.5">
                      Threshold: {item.reorderThreshold}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Stock Progress Bar */}
                  <div className="h-1.5 rounded-full bg-porcelain/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        critical ? 'bg-brick' : low ? 'bg-saffron' : 'bg-herb'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Quick Restock Button */}
                  <button
                    onClick={() => restock(item._id || item.id, item.reorderThreshold * 2 || 10)}
                    className={`w-full text-[10px] uppercase font-bold tracking-wider py-1.5 rounded transition-all cursor-pointer border ${
                      critical
                        ? 'bg-brick text-porcelain border-brick hover:bg-brick/90'
                        : low
                        ? 'bg-saffron/20 text-saffron border-saffron/40 hover:bg-saffron hover:text-ink'
                        : 'border-herb/40 text-herb hover:bg-herb hover:text-porcelain'
                    }`}
                  >
                    + Restock ({item.reorderThreshold * 2 || 10})
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
