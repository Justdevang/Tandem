import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

interface StaffRouteProps {
  children: ReactNode
  onRedirectToMenu?: () => void
}

/**
 * Route Guard Component for Staff Dashboard (/staff/*)
 * - Shows loading state while auth state is resolving
 * - Redirects to /menu if there is no authenticated user, or if role is not "staff" or "admin"
 * - Renders children (StaffDashboard) only if the role check passes
 */
export default function StaffRoute({ children, onRedirectToMenu }: StaffRouteProps) {
  const { user, userRole, loading } = useAuth()
  const isUnauthorized = !loading && (!user || (userRole !== 'staff' && userRole !== 'admin'))

  useEffect(() => {
    if (isUnauthorized) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/staff')) {
        window.history.replaceState({}, '', '/menu')
      }
      if (onRedirectToMenu) {
        onRedirectToMenu()
      }
    }
  }, [isUnauthorized, onRedirectToMenu])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-porcelain">
        <div className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Tandem</h1>
          <p className="font-mono text-xs text-steel mt-2 animate-pulse">Verifying Staff Authorization...</p>
        </div>
      </div>
    )
  }

  if (isUnauthorized) {
    return null
  }

  return <>{children}</>
}
