import { useEffect, useState } from 'react'
import { FileText, Utensils, Check, Lightbulb } from 'lucide-react'
import { type Table } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import InvoiceModal, { type InvoiceData } from '@/components/InvoiceModal'

const statusStyles: Record<string, string> = {
  free: 'border-herb/40 bg-herb/10 text-herb',
  occupied: 'border-saffron/50 bg-saffron/10 text-saffron',
  billing: 'border-brick/50 bg-brick/10 text-brick',
}

const statusLabel: Record<string, string> = {
  free: 'Free',
  occupied: 'Occupied',
  billing: 'Billing',
}

export default function TablesFloor() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [activeInvoice, setActiveInvoice] = useState<InvoiceData | null>(null)
  const [confirmOccupyTable, setConfirmOccupyTable] = useState<Table | null>(null)

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await api<Table[]>('/api/tables')
        setTables(data)
      } catch (err) {
        console.error('Failed to fetch tables:', err)
        const { tables: mockTables } = await import('@/data/mock')
        setTables(mockTables)
      } finally {
        setLoading(false)
      }
    }

    fetchTables()

    const socket = getSocket()
    socket.on('tables:updated', (data: Table[]) => {
      setTables(data)
    })

    return () => {
      socket.off('tables:updated')
    }
  }, [])

  const handleTableClick = async (table: Table) => {
    // If table is in billing or occupied status, open invoice generator
    if (table.status === 'billing' || table.status === 'occupied') {
      try {
        const invoice = await api<InvoiceData>(`/api/bills/table/${table.id}`)
        setActiveInvoice(invoice)
        return
      } catch {
        // Fallback demo invoice if no active backend order found yet
        setActiveInvoice({
          invoiceNumber: `INV-00${table.id}-MOCK`,
          tableId: table.id,
          orderType: 'dine-in',
          subtotal: 700,
          tax: 35,
          serviceCharge: 35,
          total: 770,
          itemizedList: [
            { name: 'Paneer Tikka Masala', qty: 1, price: 320, total: 320 },
            { name: 'Butter Chicken', qty: 1, price: 380, total: 380 },
          ],
        })
        return
      }
    }

    // If table is free, prompt confirmation before occupying
    setConfirmOccupyTable(table)
  }

  const confirmChangeStatus = async (table: Table, status: string) => {
    setConfirmOccupyTable(null)
    try {
      await api(`/api/tables/${table.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error('Failed to update table:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading tables...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-5 font-mono text-xs text-porcelain/60">
          {Object.entries(statusLabel).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${
                key === 'free' ? 'bg-herb' : key === 'occupied' ? 'bg-saffron' : 'bg-brick'
              }`} />
              {label}
            </div>
          ))}
        </div>

        <p className="font-mono text-xs text-porcelain/40 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-saffron" /> Click table to manage status or generate invoice
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {tables.map((t) => (
          <div
            key={t.id}
            onClick={() => handleTableClick(t)}
            className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md relative p-3 text-center ${statusStyles[t.status]}`}
          >
            <span className="font-display text-3xl font-bold">{t.id}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
              {t.capacity} Seats
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full mt-1 border border-current opacity-90 flex items-center gap-1">
              {t.status === 'billing' ? (
                <>
                  <FileText className="w-2.5 h-2.5" /> Bill Ready
                </>
              ) : t.status === 'occupied' ? (
                <>
                  <Utensils className="w-2.5 h-2.5" /> Occupied
                </>
              ) : (
                <>
                  <Check className="w-2.5 h-2.5" /> Free
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Confirmation Modal for Occupying Free Table */}
      {confirmOccupyTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200 font-mono">
          <div className="bg-paper text-ink rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-ink/10 pb-3">
              <h3 className="font-display text-xl font-bold">Table {confirmOccupyTable.id} Status</h3>
              <button
                onClick={() => setConfirmOccupyTable(null)}
                className="text-ink/40 hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-steel leading-relaxed">
              Table {confirmOccupyTable.id} has {confirmOccupyTable.capacity} seats and is currently <strong className="text-herb uppercase font-bold">Free</strong>.
              Would you like to manually mark this table as occupied?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmOccupyTable(null)}
                className="flex-1 border border-ink/20 text-ink text-xs uppercase tracking-wide py-2.5 rounded font-semibold hover:bg-ink/5 transition-colors cursor-pointer"
              >
                Cancel (Keep Free)
              </button>
              <button
                onClick={() => confirmChangeStatus(confirmOccupyTable, 'occupied')}
                className="flex-1 bg-saffron text-ink text-xs uppercase tracking-wide py-2.5 rounded font-bold hover:bg-saffron-deep transition-colors cursor-pointer shadow-sm"
              >
                Mark Occupied
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {activeInvoice && (
        <InvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
          onPaid={() => {
            setActiveInvoice(null)
          }}
        />
      )}
    </div>
  )
}
