import { useState } from 'react'
import { api } from '@/lib/api'

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const data = await api<{ reply: string }>('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
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
    <div className="fixed bottom-24 right-6 z-50 w-80 bg-white border border-ink/10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-porcelain">
        <div>
          <p className="font-mono text-[10px] tracking-wider uppercase text-steel">Tandem</p>
          <p className="text-sm font-medium text-ink">Menu Assistant</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-ink/50 hover:text-ink transition-colors"
          aria-label="Close assistant"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px] min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-steel text-sm text-center mt-8">
            Ask me about today's menu! 🍽️
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${
              msg.role === 'user'
                ? 'text-right'
                : 'text-left'
            }`}
          >
            <span
              className={`inline-block px-3 py-2 rounded-lg max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-ink text-porcelain'
                  : 'bg-paper text-ink border border-ink/10'
              }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="inline-block px-3 py-2 rounded-lg bg-paper text-steel border border-ink/10 font-mono text-xs">
              typing...
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-ink/10 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's good today?"
          className="flex-1 border border-ink/15 rounded-sm px-3 py-2 text-sm bg-porcelain text-ink focus:outline-none focus:border-saffron transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-saffron text-ink px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wide hover:bg-saffron-deep hover:text-porcelain transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
