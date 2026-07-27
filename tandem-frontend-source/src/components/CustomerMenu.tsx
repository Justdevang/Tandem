import { useEffect, useMemo, useState } from 'react'
import { Utensils, ShoppingBag, Users, Zap, Clock, FileText, CreditCard, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { type MenuItem, type Table } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import ChatAssistant from '@/components/ChatAssistant'
import InvoiceModal, { type InvoiceData } from '@/components/InvoiceModal'

const categories = ['All', 'Starters', 'Mains', 'Breads', 'Desserts', 'Beverages']

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

// Preset Taste Preferences per Category
const getPresetsForCategory = (category: string): string[] => {
  if (category === 'Starters' || category === 'Mains') {
    return ['🌶️ Medium Spicy', '🔥 Extra Spicy', '🌿 Less Oil', '🧅 No Onion-Garlic']
  }
  if (category === 'Beverages') {
    return ['🧊 Less Ice', '🍬 Less Sugar', '🥛 Extra Milk']
  }
  return []
}

export default function CustomerMenu() {
  const [active, setActive] = useState('All')
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in')
  const [selectedTable, setSelectedTable] = useState<number>(4)
  const [tablesList, setTablesList] = useState<Table[]>(defaultTables)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [menuItems, setMenuItems] = useState<(MenuItem & { _id?: string; isAvailable?: boolean; avgPrepMinutes?: number; currentlyThrottled?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  
  // Persistent Live Order Tracker State
  const [activeOrder, setActiveOrder] = useState<{
    id?: string
    _id?: string
    pickupCode?: string
    etaMinutes: number
    tableId?: number
    orderType: 'dine-in' | 'takeaway'
    status: string
    isPaid?: boolean
  } | null>(null)

  const [activeCustomerInvoice, setActiveCustomerInvoice] = useState<InvoiceData | null>(null)

  const [kitchenLoad, setKitchenLoad] = useState<{
    loadScore: number
    loadLevel: 'Low' | 'Medium' | 'High'
    activeTicketCount: number
    isManualBusy: boolean
  }>({ loadScore: 15, loadLevel: 'Low', activeTicketCount: 0, isManualBusy: false })

  const [errorMessage, setErrorMessage] = useState('')
  const [orderSuccessMessage, setOrderSuccessMessage] = useState('')

  // Fetch menu, tables, and kitchen load on mount + listen for socket updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuData, tableData, loadData] = await Promise.all([
          api<any[]>('/api/menu'),
          api<Table[]>('/api/tables').catch(() => defaultTables),
          api<any>('/api/kitchen/load').catch(() => ({ loadScore: 15, loadLevel: 'Low' })),
        ])
        setMenuItems(menuData)
        if (loadData) setKitchenLoad(loadData)
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

    // Listen for real-time menu, tables, ticket status, and kitchen load updates
    const socket = getSocket()

    socket.on('kitchen:load-updated', (data: any) => {
      if (data) setKitchenLoad(data)
      api<any[]>('/api/menu').then((items) => setMenuItems(items)).catch(() => {})
    })

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

    socket.on('ticket:updated', (ticket: any) => {
      setActiveOrder((current) => {
        if (!current) return null
        const matchesId = (current._id && current._id === ticket._id) || (current.id && current.id === ticket.id)
        const matchesTable = current.orderType === 'dine-in' && current.tableId === ticket.table
        const matchesCode = current.orderType === 'takeaway' && current.pickupCode === ticket.pickupCode

        if (matchesId || matchesTable || matchesCode) {
          return {
            ...current,
            status: ticket.status,
            etaMinutes: ticket.etaMinutes || current.etaMinutes,
          }
        }
        return current
      })
    })

    socket.on('bill:paid', (data: { tableId?: number; billId?: string }) => {
      setActiveOrder((current) => {
        if (!current) return null
        if (!data.tableId || current.tableId === data.tableId) {
          return {
            ...current,
            isPaid: true,
            status: 'billed',
          }
        }
        return current
      })
      setActiveCustomerInvoice((prev) => {
        if (!prev) return null
        if (!data.tableId || prev.tableId === data.tableId) {
          return { ...prev, isPaid: true }
        }
        return prev
      })
    })

    return () => {
      socket.off('menu:updated')
      socket.off('tables:updated')
      socket.off('ticket:updated')
      socket.off('bill:paid')
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
      const nextCart = { ...cart }
      delete nextCart[id]
      setCart(nextCart)
      const nextNotes = { ...itemNotes }
      delete nextNotes[id]
      setItemNotes(nextNotes)
    } else {
      setCart((c) => ({ ...c, [id]: currentQty - 1 }))
    }
  }

  const toggleTastePreset = (itemId: string, preset: string) => {
    setItemNotes((prev) => {
      const current = prev[itemId] || ''
      if (current.includes(preset)) {
        const updated = current.replace(preset, '').replace(/,\s*,/g, ',').trim()
        return { ...prev, [itemId]: updated }
      }
      const updated = current ? `${current}, ${preset}` : preset
      return { ...prev, [itemId]: updated }
    })
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
      notes: itemNotes[id] || undefined,
    }))

    const existingSessionId = sessionStorage.getItem(`tandem_sess_t${selectedTable}`) || undefined

    try {
      const res = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderType,
          tableId: orderType === 'dine-in' ? selectedTable : undefined,
          sessionId: existingSessionId,
          items,
        }),
      })

      if (res.order?.sessionId) {
        sessionStorage.setItem(`tandem_sess_t${selectedTable}`, res.order.sessionId)
      }

      setCart({})
      setItemNotes({})
      setActiveOrder({
        id: res.ticket?.id,
        _id: res.ticket?._id,
        pickupCode: res.pickupCode || res.ticket?.pickupCode,
        etaMinutes: res.etaMinutes || res.ticket?.etaMinutes || 15,
        tableId: selectedTable,
        orderType,
        status: res.ticket?.status || 'new',
      })

      const successText =
        orderType === 'takeaway'
          ? `✓ Takeaway Order #${res.pickupCode || 'placed'} created! ETA ~${res.etaMinutes || 15} min.`
          : `✓ Order placed for Table ${selectedTable}! Kitchen ETA ~${res.etaMinutes || 15} min.`

      setOrderSuccessMessage(successText)
      setTimeout(() => setOrderSuccessMessage(''), 5000)
    } catch (err: any) {
      console.error('Failed to place order:', err)
      setErrorMessage(err.message || 'Failed to place order.')
      setTimeout(() => setErrorMessage(''), 4000)
    }
  }

  const handleAddItemsFromChat = (itemsSpec: { id?: string; name?: string; qty: number }[]) => {
    setCart((prevCart) => {
      const nextCart = { ...prevCart }
      let itemsAddedCount = 0
      for (const itemSpec of itemsSpec) {
        const match = menuItems.find(
          (m) =>
            (itemSpec.id && (m._id === itemSpec.id || m.id === itemSpec.id)) ||
            (itemSpec.name && m.name.toLowerCase().trim() === itemSpec.name.toLowerCase().trim()) ||
            (itemSpec.name && m.name.toLowerCase().includes(itemSpec.name.toLowerCase().trim()))
        )
        if (match && match.stockQty > 0) {
          const matchId = getItemId(match)
          const current = nextCart[matchId] || 0
          const qtyToAdd = itemSpec.qty || 1
          nextCart[matchId] = Math.min(current + qtyToAdd, match.stockQty)
          itemsAddedCount += qtyToAdd
        }
      }
      if (itemsAddedCount > 0) {
        setOrderSuccessMessage(`✓ Chatbot added ${itemsAddedCount} item(s) to your order!`)
        setTimeout(() => setOrderSuccessMessage(''), 4000)
      }
      return nextCart
    })
  }

  return (
    <div className="min-h-full bg-porcelain text-ink pb-28">
      {/* Header with Order Type Switcher & Table Selection */}
      <header className="border-b border-ink/10 px-6 py-6 md:px-12 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-6 flex-wrap">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-ink">Tandem</h1>
            
            {/* Order Type Switcher & Table Selection */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-ink/5 border border-ink/15 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setOrderType('dine-in')}
                  className={`px-3 py-1 font-mono text-xs uppercase tracking-wide rounded-sm transition-all flex items-center gap-1.5 ${
                    orderType === 'dine-in'
                      ? 'bg-ink text-porcelain font-semibold shadow-sm'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" /> Dine-in
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`px-3 py-1 font-mono text-xs uppercase tracking-wide rounded-sm transition-all flex items-center gap-1.5 ${
                    orderType === 'takeaway'
                      ? 'bg-saffron text-ink font-semibold shadow-sm'
                      : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Takeaway
                </button>
              </div>

              {orderType === 'dine-in' && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] tracking-wider text-steel uppercase">Table:</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                    className="font-mono text-xs bg-white border border-ink/20 rounded px-3 py-1 text-ink focus:outline-none focus:border-saffron font-semibold cursor-pointer shadow-sm"
                  >
                    {tablesList.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.id} ({t.capacity} Seats)
                      </option>
                    ))}
                  </select>
                  <span className="font-mono text-xs bg-saffron/15 text-saffron-deep px-2.5 py-1 rounded-sm font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {currentTableObj.capacity} Seats
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <p className="font-mono text-[11px] tracking-[0.2em] text-steel uppercase">Live Menu & Queue</p>
            <div className="flex items-center gap-2 justify-end mt-1 font-mono text-xs">
              <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 border transition-all ${
                kitchenLoad.loadLevel === 'High'
                  ? 'bg-brick/15 text-brick border-brick/40 animate-pulse'
                  : kitchenLoad.loadLevel === 'Medium'
                  ? 'bg-saffron/15 text-saffron-deep border-saffron/40'
                  : 'bg-herb/15 text-herb border-herb/40'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  kitchenLoad.loadLevel === 'High' ? 'bg-brick' : kitchenLoad.loadLevel === 'Medium' ? 'bg-saffron-deep' : 'bg-herb'
                }`} />
                {kitchenLoad.loadLevel === 'High' ? (
                  <span className="flex items-center gap-1">Kitchen Rush <Zap className="w-3 h-3 text-brick" /></span>
                ) : kitchenLoad.loadLevel === 'Medium' ? (
                  'Moderate Rush'
                ) : (
                  'Normal Queue'
                )}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Persistent Live Order Tracker Banner */}
      {activeOrder && (
        <div className="bg-ink text-porcelain px-6 py-4 border-b border-saffron/40 flex items-center justify-between font-mono text-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                activeOrder.isPaid
                  ? 'bg-herb'
                  : activeOrder.status === 'served' || activeOrder.status === 'billed'
                  ? 'bg-herb'
                  : 'bg-saffron'
              } opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                activeOrder.isPaid
                  ? 'bg-herb'
                  : activeOrder.status === 'served' || activeOrder.status === 'billed'
                  ? 'bg-herb'
                  : 'bg-saffron'
              }`}></span>
            </span>
            <div>
              <p className="font-semibold text-sm">
                {activeOrder.orderType === 'takeaway'
                  ? `Takeaway Order #${activeOrder.pickupCode}`
                  : `Table ${activeOrder.tableId} Order Active`}
              </p>
              <p className="text-xs text-porcelain/70 mt-0.5">
                {activeOrder.isPaid ? (
                  <>
                    Status: <span className="uppercase text-herb font-bold">ORDER COMPLETE & PAID ✓</span> &middot; Official Receipt Shared
                  </>
                ) : activeOrder.status === 'served' || activeOrder.status === 'billed' ? (
                  <>
                    Status: <span className="uppercase text-herb font-bold">ORDER SERVED</span> &middot; Complete payment to receive receipt
                  </>
                ) : (
                  <>
                    Status: <span className="uppercase text-saffron font-bold">{activeOrder.status}</span> &middot; Kitchen ETA: <strong className={activeOrder.etaMinutes <= 20 ? 'text-herb font-bold' : 'text-saffron font-bold'}>Ready in ~{activeOrder.etaMinutes} min</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (activeOrder.tableId) {
                  const isComplete = activeOrder.status === 'served' || activeOrder.status === 'billed'
                  try {
                    const inv = await api<InvoiceData>(`/api/bills/table/${activeOrder.tableId}`)
                    setActiveCustomerInvoice({
                      ...inv,
                      isComplete: inv.isComplete ?? isComplete,
                      isPaid: activeOrder.isPaid || inv.isPaid || false,
                    })
                  } catch {
                    setActiveCustomerInvoice({
                      invoiceNumber: `INV-00${activeOrder.tableId}-LIVE`,
                      tableId: activeOrder.tableId,
                      orderType: activeOrder.orderType,
                      pickupCode: activeOrder.pickupCode,
                      subtotal: 700,
                      tax: 35,
                      serviceCharge: 35,
                      total: 770,
                      isComplete,
                      isPaid: activeOrder.isPaid || false,
                      itemizedList: [
                        { name: 'Paneer Tikka Masala', qty: 1, price: 320, total: 320 },
                        { name: 'Butter Chicken', qty: 1, price: 380, total: 380 },
                      ],
                    })
                  }
                }
              }}
              className={`text-xs px-3 py-1.5 rounded font-bold uppercase transition-colors cursor-pointer border flex items-center gap-1.5 ${
                activeOrder.isPaid
                  ? 'bg-herb/20 border-herb text-herb hover:bg-herb hover:text-porcelain'
                  : activeOrder.status === 'served' || activeOrder.status === 'billed'
                  ? 'bg-herb border-herb text-porcelain hover:bg-herb/90 animate-pulse shadow-md'
                  : 'bg-saffron/20 border-saffron text-saffron hover:bg-saffron hover:text-ink'
              }`}
            >
              {activeOrder.isPaid ? (
                <>
                  <FileText className="w-3.5 h-3.5" /> View & Share Receipt
                </>
              ) : activeOrder.status === 'served' || activeOrder.status === 'billed' ? (
                <>
                  <CreditCard className="w-3.5 h-3.5" /> Pay & Receive Receipt
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" /> View Receipt
                </>
              )}
            </button>

            <button
              onClick={() => setActiveOrder(null)}
              className="text-xs text-porcelain/40 hover:text-porcelain transition-colors uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Category rail */}
      <nav className="sticky top-0 z-10 bg-porcelain/95 backdrop-blur border-b border-ink/10 px-6 md:px-12 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 min-w-max">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active === c
                  ? 'bg-ink text-porcelain border-ink shadow-sm'
                  : 'bg-transparent text-ink/70 border-ink/15 hover:border-ink/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Layout Grid */}
      <main className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Menu items */}
          <div className="lg:col-span-8">
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
                  const currentNotes = itemNotes[id] || ''
                  const categoryPresets = getPresetsForCategory(item.category)

                  return (
                    <li key={id} className="py-5">
                      <div className="flex items-start justify-between gap-6">
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
                            {available && item.currentlyThrottled && (
                              <span
                                className="font-mono text-[10px] tracking-wider uppercase text-brick-deep bg-brick/15 border border-brick/40 px-2 py-0.5 rounded-sm flex items-center gap-1 font-semibold animate-pulse"
                                title="Kitchen queue is busy. This dish will take longer than usual."
                              >
                                <Clock className="w-3 h-3 text-brick-deep" />
                                <span>Kitchen Busy &middot; Longer Prep (~{item.avgPrepMinutes || 15}m)</span>
                              </span>
                            )}
                          </div>
                          <p className="text-steel text-sm mt-1 max-w-md leading-relaxed">{item.description}</p>
                          <p className="font-mono text-sm mt-2 text-ink/80">&#8377;{item.price}</p>
                        </div>

                        {/* Quantity controls */}
                        <div className="shrink-0 flex items-center gap-2">
                          {available && itemCartQty > 0 ? (
                            <div className="flex items-center gap-2 border border-ink/20 rounded-full px-2 py-1 bg-white shadow-sm">
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
                              className={`h-9 px-3.5 rounded-full grid place-items-center border text-sm font-mono font-medium transition-all ${
                                available
                                  ? 'border-ink text-ink hover:bg-ink hover:text-porcelain shadow-sm'
                                  : 'border-ink/15 text-ink/25 cursor-not-allowed'
                              }`}
                              aria-label={`Add ${item.name}`}
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category-Specific Taste Preferences & Custom Notes */}
                      {available && itemCartQty > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-dashed border-ink/15 animate-in fade-in duration-200">
                          <p className="font-mono text-[11px] uppercase tracking-wider text-steel mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-saffron-deep" /> Taste Preference / Note:
                          </p>

                          {categoryPresets.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              {categoryPresets.map((preset) => {
                                const isSelected = currentNotes.includes(preset)
                                return (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => toggleTastePreset(id, preset)}
                                    className={`font-mono text-[11px] px-2.5 py-1 rounded-sm border transition-colors ${
                                      isSelected
                                        ? 'bg-saffron/20 border-saffron text-saffron-deep font-semibold'
                                        : 'bg-white border-ink/15 text-ink/70 hover:border-ink/30'
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          <input
                            type="text"
                            value={currentNotes}
                            onChange={(e) => setItemNotes((prev) => ({ ...prev, [id]: e.target.value }))}
                            placeholder={
                              categoryPresets.length > 0
                                ? 'Add custom note...'
                                : 'Add special instruction (e.g. extra crispy, served hot)...'
                            }
                            className="w-full font-mono text-xs border border-ink/15 rounded px-3 py-1.5 bg-white text-ink focus:outline-none focus:border-saffron transition-colors"
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Right Column: Live Order Summary & Cart Sidebar (Desktop) */}
          <div className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-20 bg-white border border-ink/15 rounded-2xl p-6 shadow-md font-mono space-y-5">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-xl font-bold tracking-tight text-ink">Order Summary</h3>
                <span className="text-xs bg-ink/5 px-2.5 py-1 rounded text-ink/70 font-semibold uppercase">
                  {orderType === 'takeaway' ? 'Takeaway' : `Table ${selectedTable}`}
                </span>
              </div>

              {cartCount === 0 ? (
                <div className="text-center py-8 border border-dashed border-ink/15 rounded-xl text-ink/40 text-xs">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-ink/30" />
                  <p className="font-semibold text-ink/60">Your Cart is Empty</p>
                  <p className="mt-1 text-[11px]">Select delicious dishes from the menu to build your feast!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ul className="divide-y divide-ink/10 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(cart).map(([id, qty]) => {
                      const item = menuItems.find((m) => (m._id || m.id) === id)
                      if (!item) return null
                      return (
                        <li key={id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-ink">{item.name}</p>
                            <p className="text-steel text-[11px]">&#8377;{item.price} &times; {qty}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-saffron-deep">&#8377;{item.price * qty}</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="border-t border-ink/10 pt-3 space-y-1.5 text-xs text-ink/80">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>&#8377;{cartTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes & Service (10%)</span>
                      <span>&#8377;{Math.round(cartTotal * 0.1)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-ink pt-2 border-t border-dashed border-ink/15">
                      <span>Estimated Total</span>
                      <span className="text-saffron-deep">&#8377;{cartTotal + Math.round(cartTotal * 0.1)}</span>
                    </div>
                  </div>

                  <button
                    onClick={placeOrder}
                    className="w-full bg-ink text-porcelain rounded-xl px-4 py-3.5 font-bold uppercase tracking-wider text-xs hover:bg-steel-dark transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Place Order ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-brick text-porcelain px-6 py-3 rounded-lg shadow-lg font-mono text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-porcelain" />
          <span>{errorMessage}</span>
        </div>
      )}

      {orderSuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-herb text-porcelain px-6 py-3 rounded-lg shadow-lg font-mono text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-porcelain" />
          <span>{orderSuccessMessage}</span>
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
                {orderType === 'takeaway'
                  ? 'Place Takeaway Order'
                  : `Place order for Table ${selectedTable}`}
              </span>
              <span className="font-mono">&#8377;{cartTotal}</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Assistant */}
      <ChatAssistant
        menuItems={menuItems}
        onAddToCart={handleAddItemsFromChat}
        onPlaceOrder={placeOrder}
      />

      {/* Customer Invoice Modal */}
      {activeCustomerInvoice && (
        <InvoiceModal
          invoice={activeCustomerInvoice}
          onClose={() => setActiveCustomerInvoice(null)}
          onPaid={() => {
            setActiveOrder((prev) => (prev ? { ...prev, isPaid: true, status: 'billed' } : null))
            setActiveCustomerInvoice((prev) => (prev ? { ...prev, isPaid: true } : null))
          }}
        />
      )}
    </div>
  )
}
