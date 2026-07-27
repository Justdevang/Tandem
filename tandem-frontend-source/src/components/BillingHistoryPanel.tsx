import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import InvoiceModal, { type InvoiceData } from '@/components/InvoiceModal'

export interface BillHistoryRecord extends InvoiceData {
  _id: string
  status: 'paid' | 'unpaid'
  method?: 'upi' | 'card' | 'cash' | string
  createdAt: string
}



export default function BillingHistoryPanel() {
  const [bills, setBills] = useState<BillHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null)

  const fetchBills = async () => {
    try {
      const data = await api<BillHistoryRecord[]>('/api/bills')
      if (Array.isArray(data)) {
        setBills(data)
      } else {
        setBills([])
      }
    } catch (err) {
      console.error('Failed to fetch billing history:', err)
      setBills([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()

    const socket = getSocket()
    const handleRefresh = () => fetchBills()

    socket.on('bill:paid', handleRefresh)
    socket.on('bill:updated', handleRefresh)
    socket.on('tables:updated', handleRefresh)
    socket.on('ticket:new', handleRefresh)

    return () => {
      socket.off('bill:paid', handleRefresh)
      socket.off('bill:updated', handleRefresh)
      socket.off('tables:updated', handleRefresh)
      socket.off('ticket:new', handleRefresh)
    }
  }, [])

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        b.invoiceNumber.toLowerCase().includes(q) ||
        (b.tableId && `table ${b.tableId}`.includes(q)) ||
        (b.pickupCode && b.pickupCode.includes(q)) ||
        b.itemizedList.some((i) => i.name.toLowerCase().includes(q))

      return matchesStatus && matchesSearch
    })
  }, [bills, statusFilter, searchQuery])

  // Summary Metrics
  const totalRevenue = useMemo(
    () => bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.total, 0),
    [bills]
  )
  const paidCount = useMemo(() => bills.filter((b) => b.status === 'paid').length, [bills])

  const topMethod = useMemo(() => {
    const counts: Record<string, number> = {}
    bills.forEach((b) => {
      if (b.method) counts[b.method] = (counts[b.method] || 0) + 1
    })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0].toUpperCase() : 'UPI'
  }, [bills])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading billing history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-paper/10 border border-porcelain/10 p-4 rounded-md">
          <p className="text-xs text-porcelain/50 uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-saffron">&#8377;{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-paper/10 border border-porcelain/10 p-4 rounded-md">
          <p className="text-xs text-porcelain/50 uppercase tracking-wider mb-1">Total Bills</p>
          <p className="text-2xl font-bold text-porcelain">{bills.length}</p>
        </div>
        <div className="bg-paper/10 border border-porcelain/10 p-4 rounded-md">
          <p className="text-xs text-porcelain/50 uppercase tracking-wider mb-1">Paid Invoices</p>
          <p className="text-2xl font-bold text-herb">{paidCount}</p>
        </div>
        <div className="bg-paper/10 border border-porcelain/10 p-4 rounded-md">
          <p className="text-xs text-porcelain/50 uppercase tracking-wider mb-1">Top Payment Mode</p>
          <p className="text-2xl font-bold text-porcelain">{topMethod}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-1 bg-porcelain/5 p-1 rounded border border-porcelain/10 w-full sm:w-auto">
          {(['all', 'paid', 'unpaid'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs uppercase tracking-wide rounded transition-colors ${
                statusFilter === st
                  ? 'bg-porcelain text-ink font-bold'
                  : 'text-porcelain/60 hover:text-porcelain'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Invoice #, Table, or Item..."
          className="w-full sm:w-72 bg-porcelain/5 border border-porcelain/15 rounded px-3 py-1.5 text-xs text-porcelain focus:outline-none focus:border-saffron transition-colors"
        />
      </div>

      {/* Bill History List */}
      <div className="space-y-3 font-mono">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-porcelain/15 rounded-md text-porcelain/40">
            No bills found matching your filter criteria.
          </div>
        ) : (
          filteredBills.map((b) => {
            const isPaid = b.status === 'paid'
            return (
              <div
                key={b._id}
                className="bg-paper/5 border border-porcelain/10 hover:border-porcelain/25 p-4 rounded-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-porcelain">{b.invoiceNumber}</span>
                    <span className="text-xs bg-porcelain/10 px-2 py-0.5 rounded text-porcelain/80">
                      {b.orderType === 'takeaway'
                        ? `🛍️ Takeaway #${b.pickupCode || '3829'}`
                        : `🍽️ Table ${b.tableId}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isPaid ? 'bg-herb/20 text-herb border border-herb/40' : 'bg-saffron/20 text-saffron border border-saffron/40'
                      }`}
                    >
                      {isPaid ? 'PAID ✓' : 'UNPAID ⏳'}
                    </span>
                    {b.method && (
                      <span className="text-xs text-porcelain/60 uppercase">
                        {b.method === 'upi' ? '📱 UPI' : b.method === 'card' ? '💳 Card' : '💵 Cash'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-porcelain/50">
                    {new Date(b.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' '}&middot; {b.itemizedList.length} items ({b.itemizedList.map((i) => `${i.qty}x ${i.name}`).join(', ')})
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-porcelain/10">
                  <div className="text-right">
                    <p className="text-[10px] text-porcelain/40 uppercase tracking-wider">Total</p>
                    <p className="text-base font-bold text-herb">&#8377;{b.total}</p>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedInvoice({
                        ...b,
                        isComplete: true,
                        isPaid: b.status === 'paid',
                      })
                    }
                    className="text-xs border border-porcelain/20 hover:border-saffron text-porcelain hover:text-saffron px-3 py-1.5 rounded transition-colors uppercase tracking-wide font-semibold"
                  >
                    📄 View Receipt
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Invoice Modal for Selected Bill */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaid={() => {
            fetchBills()
            setSelectedInvoice(null)
          }}
        />
      )}
    </div>
  )
}
