import { useEffect, useState } from 'react'
import { type Ticket, type TicketStatus } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

const columns: { key: TicketStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'firing', label: 'Firing' },
  { key: 'ready', label: 'Ready' },
]

function TicketCard({ ticket, onAdvance }: { ticket: Ticket & { _id?: string }; onAdvance: (id: string, status: string) => void }) {
  const urgent = ticket.elapsedMin >= 12 && ticket.status !== 'ready'
  const nextStatus: Record<string, string> = { new: 'firing', firing: 'ready', ready: 'served' }
  const nextLabel: Record<string, string> = { new: '→ Fire', firing: '→ Ready', ready: '→ Served' }
  const ticketTargetId = ticket._id || ticket.id

  return (
    <div
      className="relative bg-paper text-ink font-mono text-[13px] shadow-[0_6px_16px_rgba(0,0,0,0.35)] px-4 pt-4 pb-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        clipPath:
          'polygon(0% 0%, 100% 0%, 100% 96%, 95% 100%, 90% 96%, 85% 100%, 80% 96%, 75% 100%, 70% 96%, 65% 100%, 60% 96%, 55% 100%, 50% 96%, 45% 100%, 40% 96%, 35% 100%, 30% 96%, 25% 100%, 20% 96%, 15% 100%, 10% 96%, 5% 100%, 0% 96%)',
      }}
    >
      <div className="flex items-start justify-between border-b border-dashed border-ink/25 pb-2 mb-2">
        <div>
          <p className="tracking-wider text-[15px] font-semibold">{ticket.id}</p>
          <p className="text-steel">Table {ticket.table}</p>
        </div>
        <div className="text-right">
          <p className={urgent ? 'text-brick font-semibold' : 'text-steel'}>{ticket.elapsedMin}m</p>
          <p className="text-steel/70 text-[11px]">{ticket.firedAt}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {ticket.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {it.qty}&times; {it.name}
            </span>
          </li>
        ))}
      </ul>
      {ticket.items.some((it) => it.notes) && (
        <div className="mt-2 pt-2 border-t border-dashed border-ink/25 space-y-0.5">
          {ticket.items
            .filter((it) => it.notes)
            .map((it, i) => (
              <p key={i} className="text-brick text-[11px] uppercase tracking-wide">
                * {it.name}: {it.notes}
              </p>
            ))}
        </div>
      )}
      {/* Advance button */}
      {nextStatus[ticket.status] && (
        <button
          onClick={() => onAdvance(ticketTargetId, nextStatus[ticket.status])}
          className="mt-3 w-full border border-saffron/50 text-saffron font-mono text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-sm hover:bg-saffron hover:text-ink transition-colors cursor-pointer"
        >
          {nextLabel[ticket.status]}
        </button>
      )}
    </div>
  )
}

export default function TicketRail() {
  const [tickets, setTickets] = useState<(Ticket & { _id?: string })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = async () => {
    try {
      const data = await api<any[]>('/api/orders?status=new,firing,ready')
      setTickets(data)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
      const { tickets: mockTickets } = await import('@/data/mock')
      setTickets(mockTickets)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()

    // Listen for real-time ticket events
    const socket = getSocket()

    socket.on('ticket:new', (ticket: any) => {
      setTickets((prev) => {
        // Prevent duplicate
        const exists = prev.some((t) => (t._id || t.id) === (ticket._id || ticket.id))
        if (exists) return prev
        return [ticket, ...prev]
      })
    })

    socket.on('ticket:updated', (updatedTicket: any) => {
      setTickets((prev) => {
        // Remove if served/billed
        if (!['new', 'firing', 'ready'].includes(updatedTicket.status)) {
          return prev.filter((t) => (t._id || t.id) !== (updatedTicket._id || updatedTicket.id))
        }
        // Update existing
        const exists = prev.some((t) => (t._id || t.id) === (updatedTicket._id || updatedTicket.id))
        if (exists) {
          return prev.map((t) =>
            (t._id || t.id) === (updatedTicket._id || updatedTicket.id) ? updatedTicket : t
          )
        }
        return [updatedTicket, ...prev]
      })
    })

    return () => {
      socket.off('ticket:new')
      socket.off('ticket:updated')
    }
  }, [])

  const advanceTicket = async (id: string, status: string) => {
    // Optimistic UI update
    setTickets((prev) =>
      prev
        .map((t) => {
          if ((t._id || t.id) === id) {
            return { ...t, status: status as TicketStatus }
          }
          return t;
        })
        .filter((t) => ['new', 'firing', 'ready'].includes(t.status))
    )

    try {
      await api(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error('Failed to advance ticket:', err)
      // Re-fetch on error to revert to true state
      fetchTickets()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="font-mono text-sm text-porcelain/50 animate-pulse">Loading tickets...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col) => {
        const items = tickets.filter((t) => t.status === col.key)
        return (
          <div key={col.key}>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-porcelain/60">{col.label}</h3>
              <span className="font-mono text-xs text-porcelain/40">{items.length}</span>
            </div>
            <div>
              {items.length === 0 && (
                <p className="font-mono text-xs text-porcelain/30 px-1">No tickets</p>
              )}
              {items.map((t) => (
                <TicketCard key={t._id || t.id} ticket={t} onAdvance={advanceTicket} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
