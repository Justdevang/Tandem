import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  categoryOptions?: string[]
  itemCards?: any[]
  showPlaceOrderBtn?: boolean
}

interface ChatAssistantProps {
  menuItems?: any[]
  onAddToCart?: (items: { id?: string; name?: string; qty: number }[]) => void
  onPlaceOrder?: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  Starters: '🥗',
  Mains: '🍲',
  Breads: '🫓',
  Desserts: '🍨',
  Beverages: '🥤',
}

export default function ChatAssistant({ menuItems = [], onAddToCart, onPlaceOrder }: ChatAssistantProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [localMenu, setLocalMenu] = useState<any[]>(menuItems)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch menu if not provided via props
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      setLocalMenu(menuItems)
    } else {
      api<any[]>('/api/menu')
        .then((data) => setLocalMenu(data))
        .catch(() => {})
    }
  }, [menuItems])

  // Initial welcome greeting on open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          text: "Hello! Welcome to Tandem Dining. 🍽️\nSelect a category below to explore dishes, or ask me anything about our menu!",
          categoryOptions: ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages'],
        },
      ])
    }
  }, [open, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Handle category button click
  const handleSelectCategory = (category: string) => {
    const userMsg = `Show ${category}`
    const availableCategoryItems = localMenu.filter(
      (item) => item.category.toLowerCase() === category.toLowerCase() && item.stockQty > 0
    )

    const updated = [...messages, { role: 'user' as const, text: userMsg }]

    if (availableCategoryItems.length > 0) {
      setMessages([
        ...updated,
        {
          role: 'assistant',
          text: `Here are our fresh & available ${category}:`,
          itemCards: availableCategoryItems,
        },
      ])
    } else {
      setMessages([
        ...updated,
        {
          role: 'assistant',
          text: `Here are our current menu items for ${category}:`,
          itemCards: localMenu.filter((item) => item.category.toLowerCase() === category.toLowerCase()),
        },
      ])
    }
  }

  // Handle direct item card click
  const handleSelectItem = (item: any) => {
    if (onAddToCart) {
      onAddToCart([{ id: item._id || item.id, name: item.name, qty: 1 }])
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: `Add 1x ${item.name}` },
      {
        role: 'assistant',
        text: `✓ Added 1x **${item.name}** (₹${item.price}) to your cart! 🛒\n\nWhat would you like to do next?`,
        showPlaceOrderBtn: true,
        categoryOptions: ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages'],
      },
    ])
  }

  // Handle place order action
  const handleTriggerPlaceOrder = () => {
    if (onPlaceOrder) {
      onPlaceOrder()
    }
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Place my order' },
      {
        role: 'assistant',
        text: '🧑‍🍳 Submitting your order to the kitchen now! Thank you for dining with Tandem.',
      },
    ])
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    const lowerInput = userMsg.toLowerCase()

    // Handle "hello" / "hi" / "hey" locally for instant response
    if (['hello', 'hi', 'hey', 'greetings', 'start'].includes(lowerInput)) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: userMsg },
        {
          role: 'assistant',
          text: "Hello there! 👋 Welcome to Tandem Dining.\nWhich menu section would you like to view?",
          categoryOptions: ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages'],
        },
      ])
      return
    }

    // Check if user typed a category name directly
    const matchedCategory = ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages'].find(
      (cat) => cat.toLowerCase() === lowerInput
    )
    if (matchedCategory) {
      handleSelectCategory(matchedCategory)
      return
    }

    const updatedMessages = [...messages, { role: 'user' as const, text: userMsg }]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const data = await api<{ reply: string }>('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({
          message: userMsg,
          history: updatedMessages.slice(0, -1),
        }),
      })

      let rawReply = data.reply || ''

      // Process Action Tags if present in reply
      if (rawReply.includes('[ACTION:ADD_TO_CART:')) {
        const actionMatch = rawReply.match(/\[ACTION:ADD_TO_CART:\s*(\[[\s\S]*?\])\]/)
        if (actionMatch && actionMatch[1]) {
          try {
            const items = JSON.parse(actionMatch[1])
            if (Array.isArray(items) && onAddToCart) {
              onAddToCart(items)
            }
          } catch (err) {
            console.error('Failed to parse ADD_TO_CART action tag:', err)
          }
        }
        rawReply = rawReply.replace(/\[ACTION:ADD_TO_CART:\s*\[[\s\S]*?\]\]/g, '').trim()
      }

      let showPlaceOrder = false
      if (rawReply.includes('[ACTION:PLACE_ORDER]')) {
        if (onPlaceOrder) {
          onPlaceOrder()
        }
        rawReply = rawReply.replace(/\[ACTION:PLACE_ORDER\]/g, '').trim()
        showPlaceOrder = true
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: rawReply,
          showPlaceOrderBtn: showPlaceOrder,
          categoryOptions: ['Starters', 'Mains', 'Breads', 'Desserts', 'Beverages'],
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I could not process your request right now.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 bg-ink text-porcelain h-12 w-12 rounded-full shadow-lg grid place-items-center hover:bg-steel-dark transition-colors"
        aria-label="Open menu assistant"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Interactive Dining Assistant Chat"
      className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white border border-ink/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-porcelain">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-herb animate-pulse" />
          <div>
            <p className="font-mono text-[10px] tracking-wider uppercase text-steel">Tandem AI</p>
            <h2 className="text-sm font-medium text-ink">Interactive Dining Assistant</h2>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-ink/50 hover:text-ink transition-colors p-1 rounded-md"
          aria-label="Close assistant"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[360px] min-h-[240px] bg-paper/30">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span
              className={`inline-block px-3.5 py-2.5 rounded-xl max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-ink text-porcelain shadow-sm'
                  : 'bg-white text-ink border border-ink/10 shadow-sm'
              }`}
            >
              {msg.text}
            </span>

            {/* Selectable Category Pills */}
            {msg.categoryOptions && msg.categoryOptions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 justify-start">
                {msg.categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className="bg-porcelain hover:bg-saffron hover:text-ink text-ink border border-ink/15 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>{CATEGORY_ICONS[cat] || '🍽️'}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Clickable Item Cards */}
            {msg.itemCards && msg.itemCards.length > 0 && (
              <div className="mt-3 space-y-2">
                {msg.itemCards.map((item) => {
                  const inStock = item.stockQty > 0
                  return (
                    <div
                      key={item._id || item.id}
                      className="bg-white border border-ink/10 hover:border-saffron/80 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-ink truncate">{item.name}</p>
                          <span className="font-mono text-[11px] font-bold text-saffron-deep">
                            ₹{item.price}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-steel truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectItem(item)}
                        disabled={!inStock}
                        className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                          inStock
                            ? 'bg-ink text-porcelain hover:bg-saffron hover:text-ink cursor-pointer'
                            : 'bg-ink/10 text-steel cursor-not-allowed'
                        }`}
                      >
                        {inStock ? '+ Add' : 'Sold Out'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick Action: Place Order Button */}
            {msg.showPlaceOrderBtn && (
              <div className="mt-2.5">
                <button
                  onClick={handleTriggerPlaceOrder}
                  className="w-full bg-saffron hover:bg-saffron-deep text-ink hover:text-porcelain font-mono text-xs font-bold uppercase tracking-wider py-2 px-3 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>Confirm & Place Order</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-left">
            <span className="inline-block px-3 py-2 rounded-xl bg-white text-steel border border-ink/10 font-mono text-xs shadow-xs animate-pulse">
              thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="border-t border-ink/10 p-3 bg-porcelain flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or pick a category..."
          aria-label="Ask a question to dining assistant"
          className="flex-1 border border-ink/15 rounded-lg px-3 py-2 text-xs bg-white text-ink focus:outline-none focus:border-saffron transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message to dining assistant"
          className="bg-saffron text-ink px-3 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wide hover:bg-saffron-deep hover:text-porcelain transition-colors disabled:opacity-40 cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  )
}
