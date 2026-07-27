import { useState, useEffect, Component, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { signOut } from '@/lib/auth'
import CustomerMenu from '@/components/CustomerMenu'
import StaffDashboard from '@/components/StaffDashboard'
import StaffRoute from '@/components/StaffRoute'
import AuthScreen from '@/components/AuthScreen'

type RoutePath = '/menu' | '/staff' | '/login'

// Simple Error Boundary to prevent white screen crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'An unexpected error occurred.' }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-porcelain p-6">
          <div className="max-w-md w-full text-center bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
            <h1 className="font-display text-3xl font-bold text-ink">Tandem</h1>
            <p className="font-mono text-xs text-brick mt-3 bg-brick/10 p-3 rounded border border-brick/20">
              {this.state.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-ink text-porcelain font-mono text-xs uppercase tracking-wide px-4 py-2.5 rounded hover:bg-steel-dark transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NavigationBar({ currentPath, onNavigate }: { currentPath: string; onNavigate: (path: RoutePath) => void }) {
  const { user, userRole } = useAuth()
  const isStaffRoute = currentPath.startsWith('/staff')
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'

  return (
    <div className="shrink-0 flex items-center justify-between bg-steel-dark py-2 px-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('/menu')}
          className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
            !isStaffRoute ? 'bg-porcelain text-ink font-semibold' : 'text-porcelain/50 hover:text-porcelain'
          }`}
        >
          Customer menu
        </button>

        {/* STAFF DASHBOARD tab ONLY renders if user is logged in AND userRole is 'staff' or 'admin' */}
        {user && isStaffOrAdmin && (
          <button
            onClick={() => onNavigate('/staff')}
            className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
              isStaffRoute ? 'bg-porcelain text-ink font-semibold' : 'text-porcelain/50 hover:text-porcelain'
            }`}
          >
            Staff dashboard
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="font-mono text-[10px] text-porcelain/50 hidden sm:inline">
              {user.email} ({userRole})
            </span>
            <button
              onClick={() => signOut()}
              className="font-mono text-[10px] uppercase tracking-wide text-porcelain/40 hover:text-porcelain transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => onNavigate('/login')}
            className="font-mono text-[10px] uppercase tracking-wide bg-saffron/20 text-saffron border border-saffron/40 px-2 py-1 rounded hover:bg-saffron hover:text-ink transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  )
}

function AppContent() {
  const { user, userRole, loading } = useAuth()
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/menu'
  })

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/menu')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: RoutePath) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    setCurrentPath(path)
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-porcelain">
        <div className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Tandem</h1>
          <p className="font-mono text-xs text-steel mt-2 animate-pulse">Loading Application...</p>
        </div>
      </div>
    )
  }

  // Render Login screen if path is /login
  if (currentPath === '/login') {
    if (user) {
      const destination: RoutePath = (userRole === 'staff' || userRole === 'admin') ? '/staff' : '/menu'
      navigate(destination)
    } else {
      return (
        <div className="h-screen w-full flex flex-col font-sans">
          <NavigationBar currentPath={currentPath} onNavigate={navigate} />
          <div className="flex-1 min-h-0">
            <AuthScreen />
          </div>
        </div>
      )
    }
  }

  return (
    <div className="h-screen w-full flex flex-col font-sans">
      {currentPath !== '/menu' && (
        <NavigationBar currentPath={currentPath} onNavigate={navigate} />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {currentPath.startsWith('/staff') ? (
          <StaffRoute onRedirectToMenu={() => navigate('/menu')}>
            <StaffDashboard />
          </StaffRoute>
        ) : (
          <CustomerMenu />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
