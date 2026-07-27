import { useEffect, useState } from 'react'
import { type Ticket, type TicketStatus } from '@/data/mock'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'

const columns: { key: TicketStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'firing', label: 'Firing' },
  { key: 'ready', label: 'Ready' },
]

function TicketCard({
  ticket,
  onAdvance,
  onDelete,
}: {
  ticket: Ticket & { _id?: string; orderType?: string; pickupCode?: string; etaMinutes?: number; displayLabel?: string }
  onAdvance: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const urgent = ticket.elapsedMin >= 12 && ticket.status !== 'ready'
  const nextStatus: Record<string, string> = { new: 'firing', firing: 'ready', ready: 'served' }
  const nextLabel: Record<string, string> = { new: '→ Fire', firing: '→ Ready', ready: '→ Served' }
  const ticketTargetId = ticket._id || ticket.id

  const isTakeaway = ticket.orderType === 'takeaway' || Boolean(ticket.pickupCode)
  const labelText = ticket.displayLabel || (isTakeaway ? `TAKEAWAY · #${ticket.pickupCode}` : `Table ${ticket.table}`)

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
          <div className="flex items-center gap-2">
            <p className="tracking-wider text-[15px] font-semibold">{ticket.id}</p>
            <button
              onClick={() => onDelete(ticketTargetId)}
              title="Delete Ticket"
              className="text-brick/60 hover:text-brick hover:bg-brick/10 p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Delete ticket"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <p className={isTakeaway ? 'text-saffron-deep font-semibold text-xs' : 'text-steel'}>
            {labelText}
          </p>
        </div>
        <div className="text-right">
          <p className={urgent ? 'text-brick font-semibold' : 'text-steel'}>
            {ticket.elapsedMin}m {ticket.etaMinutes ? `/ ~${ticket.etaMinutes}m ETA` : ''}
          </p>
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
      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        {nextStatus[ticket.status] && (
          <button
            onClick={() => onAdvance(ticketTargetId, nextStatus[ticket.status])}
            className="flex-1 border border-saffron/50 text-saffron font-mono text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-sm hover:bg-saffron hover:text-ink transition-colors cursor-pointer"
          >
            {nextLabel[ticket.status]}
          </button>
        )}
        <button
          onClick={() => onDelete(ticketTargetId)}
          title="Delete Ticket"
          className="border border-brick/40 text-brick font-mono text-[11px] uppercase tracking-wide px-2.5 py-1.5 rounded-sm hover:bg-brick hover:text-porcelain transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function TicketRail() {
  const [tickets, setTickets] = useState<(Ticket & { _id?: string; orderType?: string; pickupCode?: string; etaMinutes?: number; displayLabel?: string })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = async () => {
    try {
      const data = await api<any[]>('/api/orders?status=new,firing,ready')
      setTickets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
      setTickets([])
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
        const exists = prev.some((t) => (t._id || t.id) === (ticket._id || ticket.id))
        if (exists) return prev
        return [ticket, ...prev]
      })
    })

    socket.on('ticket:updated', (updatedTicket: any) => {
      setTickets((prev) => {
        if (!['new', 'firing', 'ready'].includes(updatedTicket.status)) {
          return prev.filter((t) => (t._id || t.id) !== (updatedTicket._id || updatedTicket.id))
        }
        const exists = prev.some((t) => (t._id || t.id) === (updatedTicket._id || updatedTicket.id))
        if (exists) {
          return prev.map((t) =>
            (t._id || t.id) === (updatedTicket._id || updatedTicket.id) ? updatedTicket : t
          )
        }
        return [updatedTicket, ...prev]
      })
    })

    socket.on('ticket:deleted', (data: any) => {
      setTickets((prev) => prev.filter((t) => (t._id || t.id) !== (data._id || data.id)))
    })

    return () => {
      socket.off('ticket:new')
      socket.off('ticket:updated')
      socket.off('ticket:deleted')
    }
  }, [])

  const advanceTicket = async (id: string, status: string) => {
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
      fetchTickets()
    }
  }

  const deleteTicket = async (id: string) => {
    setTickets((prev) => prev.filter((t) => (t._id || t.id) !== id))

    try {
      await api(`/api/orders/${id}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Failed to delete ticket:', err)
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
                <TicketCard key={t._id || t.id} ticket={t} onAdvance={advanceTicket} onDelete={deleteTicket} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
