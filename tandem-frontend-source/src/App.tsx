import { useState, useEffect } from 'react'
import { type User } from 'firebase/auth'
import { onAuthChange, signOut } from '@/lib/auth'
import CustomerMenu from '@/components/CustomerMenu'
import StaffDashboard from '@/components/StaffDashboard'
import AuthScreen from '@/components/AuthScreen'

type Mode = 'customer' | 'staff'

function App() {
  const [mode, setMode] = useState<Mode>('customer')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-porcelain">
        <div className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Tandem</h1>
          <p className="font-mono text-xs text-steel mt-2 animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="h-screen w-full flex flex-col font-sans">
      {/* Mode switch + user info */}
      <div className="shrink-0 flex items-center justify-between bg-steel-dark py-2 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('customer')}
            className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm transition-colors ${
              mode === 'customer' ? 'bg-porcelain text-ink' : 'text-porcelain/50 hover:text-porcelain'
            }`}
          >
            Customer menu
          </button>
          <button
            onClick={() => setMode('staff')}
            className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm transition-colors ${
              mode === 'staff' ? 'bg-porcelain text-ink' : 'text-porcelain/50 hover:text-porcelain'
            }`}
          >
            Staff dashboard
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-porcelain/50 hidden sm:inline">
            {user.email}
          </span>
          <button
            onClick={signOut}
            className="font-mono text-[10px] uppercase tracking-wide text-porcelain/40 hover:text-porcelain transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === 'customer' ? <CustomerMenu /> : <StaffDashboard />}
      </div>
    </div>
  )
}

export default App
