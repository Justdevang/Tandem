import { useEffect, useMemo, useState } from 'react'
import { type MenuItem, type Table } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import ChatAssistant from '@/components/ChatAssistant'

const categories = ['All', 'Starters', 'Mains', 'Breads', 'Desserts', 'Beverages']

// Default table fallback capacities
const defaultTables: Table[] = [
  { id: 1, capacity: 2, status: 'free' },
  { id: 2, capacity: 4, status: 'free' },
  { id: 3, capacity: 4, status: 'free' },
  { id: 4, capacity: 6, status: 'free' },
  { id: 5, capacity: 2, status: 'free' },
  { id: 6, capacity: 4, status: 'free' },
  { id: 7, capacity: 4, status: 'free' },
  { id: 8, capacity: 8, status: 'free' },
  { id: 9, capacity: 6, status: 'free' },
  { id: 10, capacity: 2, status: 'free' },
  { id: 11, capacity: 4, status: 'free' },
  { id: 12, capacity: 2, status: 'free' },
]

export default function CustomerMenu() {
  const [active, setActive] = useState('All')
  const [selectedTable, setSelectedTable] = useState<number>(4)
  const [tablesList, setTablesList] = useState<Table[]>(defaultTables)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [menuItems, setMenuItems] = useState<(MenuItem & { _id?: string; isAvailable?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch menu and tables on mount + listen for socket updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuData, tableData] = await Promise.all([
          api<any[]>('/api/menu'),
          api<Table[]>('/api/tables').catch(() => defaultTables),
        ])
        setMenuItems(menuData)
        if (Array.isArray(tableData) && tableData.length > 0) {
          setTablesList(tableData)
        }
      } catch (err) {
        console.error('Failed to fetch menu/tables:', err)
        const { menuItems: mockItems, tables: mockTables } = await import('@/data/mock')
        setMenuItems(mockItems)
        setTablesList(mockTables)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for real-time menu and table updates
    const socket = getSocket()

    socket.on('menu:updated', (data: any[]) => {
      setMenuItems(data)
      setCart((prevCart) => {
        const updatedCart: Record<string, number> = {}
        for (const [id, qty] of Object.entries(prevCart)) {
          const item = data.find((m) => (m._id || m.id) === id)
          if (item && item.stockQty > 0) {
            updatedCart[id] = Math.min(qty, item.stockQty)
          }
        }
        return updatedCart
      })
    })

    socket.on('tables:updated', (data: Table[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setTablesList(data)
      }
    })

    return () => {
      socket.off('menu:updated')
      socket.off('tables:updated')
    }
  }, [])

  const currentTableObj = tablesList.find((t) => t.id === selectedTable) || { id: selectedTable, capacity: 4 }

  const getItemId = (item: MenuItem & { _id?: string }) => item._id || item.id

  const isAvailable = (item: MenuItem & { isAvailable?: boolean }) => {
    if (typeof item.isAvailable === 'boolean') return item.isAvailable && item.stockQty > 0
    return item.stockQty > 0
  }

  const filtered = useMemo(
    () => (active === 'All' ? menuItems : menuItems.filter((m) => m.category === active)),
    [active, menuItems],
  )

  const addToCart = (item: MenuItem & { _id?: string; isAvailable?: boolean }) => {
    if (!isAvailable(item)) return
    const id = getItemId(item)
    const currentQty = cart[id] || 0
    if (currentQty >= item.stockQty) {
      setErrorMessage(`Only ${item.stockQty} ${item.name} available in stock!`)
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    setCart((c) => ({ ...c, [id]: currentQty + 1 }))
  }

  const removeFromCart = (item: MenuItem & { _id?: string }) => {
    const id = getItemId(item)
    const currentQty = cart[id] || 0
    if (currentQty <= 1) {
      const next = { ...cart }
      delete next[id]
      setCart(next)
    } else {
      setCart((c) => ({ ...c, [id]: currentQty - 1 }))
    }
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => getItemId(m) === id)
    return sum + (item ? item.price * qty : 0)
  }, 0)

  const placeOrder = async () => {
    if (cartCount === 0) return

    const items = Object.entries(cart).map(([id, qty]) => ({
      menuItemId: id,
      qty,
    }))

    try {
      await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ tableId: selectedTable, items }),
      })
      setCart({})
      setOrderPlaced(true)
      setTimeout(() => setOrderPlaced(false), 3500)
    } catch (err: any) {
      console.error('Failed to place order:', err)
      setErrorMessage(err.message || 'Failed to place order.')
      setTimeout(() => setErrorMessage(''), 4000)
    }
  }

  return (
    <div className="min-h-full bg-porcelain text-ink pb-28">
      {/* Header with Table & Seat Capacity Selection */}
      <header className="border-b border-ink/10 px-6 pt-8 pb-6 md:px-12">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] tracking-[0.25em] text-steel uppercase">Select Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(Number(e.target.value))}
                className="font-mono text-xs bg-porcelain border border-ink/20 rounded px-2.5 py-1 text-ink focus:outline-none focus:border-saffron font-semibold cursor-pointer"
              >
                {tablesList.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.id} ({t.capacity} Seats)
                  </option>
                ))}
              </select>
              <span className="font-mono text-xs bg-saffron/15 text-saffron-deep px-2.5 py-0.5 rounded-sm font-semibold">
                🪑 {currentTableObj.capacity} Seats
              </span>
              <span className="font-mono text-[11px] tracking-wider text-steel uppercase">&middot; Dine-in</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight mt-1.5">Tandem</h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[11px] tracking-[0.2em] text-steel uppercase">Live menu</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-herb opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-herb"></span>
              </span>
              <span className="text-xs text-steel">auto-synced</span>
            </div>
          </div>
        </div>
      </header>

      {/* Category rail */}
      <nav className="sticky top-0 z-10 bg-porcelain/95 backdrop-blur border-b border-ink/10 px-6 md:px-12 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active === c
                  ? 'bg-ink text-porcelain border-ink'
                  : 'bg-transparent text-ink/70 border-ink/15 hover:border-ink/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </nav>

      {/* Menu list */}
      <main className="px-6 md:px-12 py-8 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <p className="font-mono text-sm text-steel animate-pulse">Loading live menu...</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {filtered.map((item) => {
              const id = getItemId(item)
              const available = isAvailable(item)
              const low = available && item.stockQty <= item.reorderThreshold
              const itemCartQty = cart[id] || 0
              const isMaxStock = itemCartQty >= item.stockQty

              return (
                <li key={id} className="py-5 flex items-start justify-between gap-6">
                  <div className={!available ? 'opacity-40' : ''}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-display text-xl md:text-[22px] leading-snug ${
                          !available ? 'line-through decoration-brick decoration-2' : ''
                        }`}
                      >
                        {item.name}
                      </h3>
                      {!available && (
                        <span className="font-mono text-[10px] tracking-wider uppercase text-brick bg-brick-light px-2 py-0.5 rounded-sm">
                          86'd (Out of stock)
                        </span>
                      )}
                      {available && low && (
                        <span className="font-mono text-[10px] tracking-wider uppercase text-saffron-deep bg-saffron/15 px-2 py-0.5 rounded-sm">
                          {item.stockQty} left
                        </span>
                      )}
                    </div>
                    <p className="text-steel text-sm mt-1 max-w-md leading-relaxed">{item.description}</p>
                    <p className="font-mono text-sm mt-2 text-ink/80">&#8377;{item.price}</p>
                  </div>

                  {/* Quantity controls: - 0 + */}
                  <div className="shrink-0 flex items-center gap-2">
                    {available && itemCartQty > 0 ? (
                      <div className="flex items-center gap-2 border border-ink/20 rounded-full px-2 py-1 bg-white">
                        <button
                          onClick={() => removeFromCart(item)}
                          className="w-7 h-7 rounded-full grid place-items-center font-mono text-base font-bold text-ink hover:bg-porcelain transition-colors"
                          aria-label={`Remove one ${item.name}`}
                        >
                          -
                        </button>
                        <span className="font-mono text-sm font-semibold w-4 text-center">{itemCartQty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={isMaxStock}
                          className={`w-7 h-7 rounded-full grid place-items-center font-mono text-base font-bold transition-colors ${
                            isMaxStock
                              ? 'text-steel/30 cursor-not-allowed'
                              : 'text-ink hover:bg-porcelain'
                          }`}
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!available}
                        className={`h-9 px-3.5 rounded-full grid place-items-center border text-sm font-mono font-medium transition-colors ${
                          available
                            ? 'border-ink text-ink hover:bg-ink hover:text-porcelain'
                            : 'border-ink/15 text-ink/25 cursor-not-allowed'
                        }`}
                        aria-label={`Add ${item.name}`}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Notifications */}
      {orderPlaced && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-herb text-porcelain px-6 py-3 rounded-lg shadow-lg font-mono text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          ✓ Order placed for Table {selectedTable} ({currentTableObj.capacity} Seats)! Check the kitchen ticket rail.
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-brick text-porcelain px-6 py-3 rounded-lg shadow-lg font-mono text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Sticky order bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-6 md:px-12 pb-6 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <button
              onClick={placeOrder}
              className="w-full bg-ink text-porcelain rounded-xl px-5 py-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-steel-dark transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="font-mono text-xs bg-porcelain/15 rounded-full h-6 w-6 grid place-items-center">
                  {cartCount}
                </span>
                Place order for Table {selectedTable} ({currentTableObj.capacity} Seats)
              </span>
              <span className="font-mono">&#8377;{cartTotal}</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  )
}
