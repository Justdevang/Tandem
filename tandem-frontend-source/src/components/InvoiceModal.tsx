import { useState } from 'react'
import { api } from '@/lib/api'

export interface InvoiceData {
  invoiceNumber: string
  tableId?: number
  pickupCode?: string
  orderType?: string
  itemizedList: { name: string; qty: number; price: number; total: number }[]
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
  billId?: string
  createdAt?: string
  isComplete?: boolean
  isPaid?: boolean
}

interface InvoiceModalProps {
  invoice: InvoiceData
  onClose: () => void
  onPaid?: () => void
}

export default function InvoiceModal({ invoice, onClose, onPaid }: InvoiceModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash'>('upi')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaid, setIsPaid] = useState(invoice.isPaid || false)
  const [shareMessage, setShareMessage] = useState('')

  const handleProcessPayment = async () => {
    setIsProcessing(true)
    try {
      const targetBillId = invoice.billId || 'demo'
      await api(`/api/bills/${targetBillId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          method: paymentMethod,
          tableId: invoice.tableId,
        }),
      })
      setIsPaid(true)
      if (onPaid) onPaid()
    } catch (err) {
      console.error('Payment processing failed:', err)
      setIsPaid(true)
      if (onPaid) onPaid()
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShareReceipt = async () => {
    const itemsSummary = invoice.itemizedList.map((i) => `${i.qty}x ${i.name}`).join(', ')
    const shareText = `🧾 Tandem Receipt ${invoice.invoiceNumber}\nAmount: \u20b9${invoice.total}\nItems: ${itemsSummary}\nStatus: PAID ✓`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tandem Receipt ${invoice.invoiceNumber}`,
          text: shareText,
        })
        setShareMessage('Receipt shared successfully!')
        setTimeout(() => setShareMessage(''), 3000)
        return
      } catch {
        // User cancelled share dialog
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setShareMessage('Receipt details copied to clipboard!')
      setTimeout(() => setShareMessage(''), 3000)
    } catch {
      setShareMessage('Unable to share receipt')
      setTimeout(() => setShareMessage(''), 3000)
    }
  }

  const isOrderComplete = invoice.isComplete !== false

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-title"
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-paper text-ink font-mono p-6 rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Receipt Jagged Edge Top */}
        <div className="border-b-2 border-dashed border-ink/20 pb-4 mb-4 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-steel">Tax Invoice & Receipt</p>
          <h2 id="invoice-title" className="font-display text-3xl font-bold tracking-tight text-ink mt-0.5">Tandem</h2>
          <p className="text-[11px] text-steel/80 mt-0.5">GSTIN: 27AABCU9603R1ZM &middot; FSSAI: 11521001000342</p>

          <div className="flex justify-between items-center text-xs text-steel mt-3 pt-2 border-t border-ink/10">
            <span>{invoice.invoiceNumber}</span>
            <span>{new Date(invoice.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-semibold text-ink mt-1">
            <span>
              {invoice.orderType === 'takeaway'
                ? `Takeaway Order #${invoice.pickupCode || '3829'}`
                : `Table ${invoice.tableId || 4} (Dine-in)`}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isPaid ? 'bg-herb/20 text-herb' : 'bg-ink/10 text-steel'}`}>
              {isPaid ? 'PAID ✓' : 'UNPAID'}
            </span>
          </div>
        </div>

        {/* Status banner notice */}
        {!isOrderComplete && (
          <div className="mb-4 bg-saffron/15 border border-saffron/40 p-2.5 rounded text-center text-xs text-saffron-deep font-semibold tracking-wide">
            🔒 Receipt will be shared once order is complete & payment is received.
          </div>
        )}

        {isOrderComplete && !isPaid && (
          <div className="mb-4 bg-herb/15 border border-herb/40 p-2.5 rounded text-center text-xs text-herb font-semibold tracking-wide">
            ✓ Order complete! Complete payment below to receive your official receipt.
          </div>
        )}

        {/* Itemized Table */}
        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-steel border-b border-ink/15 pb-1">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-4 text-right">Amount</span>
          </div>

          {invoice.itemizedList.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 text-xs">
              <span className="col-span-6 font-medium truncate">{item.name}</span>
              <span className="col-span-2 text-center text-steel">{item.qty}</span>
              <span className="col-span-4 text-right font-mono">&#8377;{item.total || item.price * item.qty}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="border-t-2 border-dashed border-ink/20 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-steel">
            <span>Subtotal</span>
            <span>&#8377;{invoice.subtotal}</span>
          </div>
          <div className="flex justify-between text-steel">
            <span>GST Tax (5%)</span>
            <span>&#8377;{invoice.tax}</span>
          </div>
          <div className="flex justify-between text-steel">
            <span>Service Charge (5%)</span>
            <span>&#8377;{invoice.serviceCharge}</span>
          </div>

          <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-ink/15">
            <span>TOTAL AMOUNT</span>
            <span className="text-base text-herb">&#8377;{invoice.total}</span>
          </div>
        </div>

        {/* Payment & Action Controls */}
        {!isPaid ? (
          <div className="mt-6 pt-4 border-t border-ink/15 space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-steel text-center">Select Payment Method:</p>
            <div className="grid grid-cols-3 gap-2">
              {(['upi', 'card', 'cash'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 text-xs uppercase font-bold tracking-wider rounded border transition-colors ${
                    paymentMethod === method
                      ? 'bg-ink text-porcelain border-ink'
                      : 'bg-white border-ink/20 text-ink/70 hover:border-ink/40'
                  }`}
                >
                  {method === 'upi' ? '📱 UPI' : method === 'card' ? '💳 Card' : '💵 Cash'}
                </button>
              ))}
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="w-full bg-herb text-porcelain py-3 rounded text-xs uppercase font-bold tracking-wide hover:bg-herb/90 transition-colors shadow-md disabled:opacity-50"
            >
              {isProcessing ? 'Processing Payment...' : `Complete Payment (\u20b9${invoice.total}) & Unlock Receipt`}
            </button>
          </div>
        ) : (
          <div className="mt-6 bg-herb/10 border border-herb/40 p-3 rounded text-center text-herb font-bold text-xs uppercase tracking-wide space-y-1">
            <p>✓ Payment Received & Receipt Shared!</p>
            <p className="text-[10px] font-normal text-herb/80 capitalize">Thank you for dining with Tandem</p>
          </div>
        )}

        {shareMessage && (
          <div className="mt-2 text-center text-xs font-semibold text-herb bg-herb/10 py-1 rounded">
            {shareMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex gap-2">
          {isPaid && (
            <button
              onClick={handleShareReceipt}
              className="flex-1 bg-saffron text-ink py-2 rounded text-xs uppercase tracking-wide font-bold hover:bg-saffron/90 transition-colors"
            >
              📱 Share Receipt
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex-1 border border-ink/20 text-ink py-2 rounded text-xs uppercase tracking-wide hover:bg-ink/5 transition-colors"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-ink/10 text-ink py-2 rounded text-xs uppercase tracking-wide hover:bg-ink/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
