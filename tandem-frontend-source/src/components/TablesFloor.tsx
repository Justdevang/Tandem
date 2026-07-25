import { useEffect, useState } from 'react'
import { type Table } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

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

const nextStatus: Record<string, string> = {
  free: 'occupied',
  occupied: 'billing',
  billing: 'free',
}

export default function TablesFloor() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

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

  const toggleStatus = async (table: Table) => {
    try {
      await api(`/api/tables/${table.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus[table.status] }),
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
      <div className="flex items-center gap-5 mb-6 font-mono text-xs text-porcelain/60">
        {Object.entries(statusLabel).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${
              key === 'free' ? 'bg-herb' : key === 'occupied' ? 'bg-saffron' : 'bg-brick'
            }`} />
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((t) => (
          <div
            key={t.id}
            onClick={() => toggleStatus(t)}
            className={`aspect-square rounded-md border flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${statusStyles[t.status]}`}
          >
            <span className="font-display text-2xl font-medium">{t.id}</span>
            <span className="font-mono text-[10px] uppercase tracking-wide opacity-80">
              seats {t.capacity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
