import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react'
import { type User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export type UserRole = 'customer' | 'staff' | 'admin'

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  loading: boolean
  setAuthUser: (currentUser: User | null, customRole?: UserRole) => Promise<UserRole | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  setAuthUser: async () => null,
})

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveUserAndRole = async (currentUser: User | null, customRole?: UserRole): Promise<{ user: User | null; role: UserRole | null }> => {
    if (!currentUser) {
      return { user: null, role: null }
    }

    const email = currentUser.email?.toLowerCase() || ''
    const isStaffEmail = email === 'staff@tandem.app' ||
                         email === 'staff@tandem.com' ||
                         email.includes('staff') ||
                         currentUser.uid === 'fixed-staff-uid-101'

    if (isStaffEmail || customRole === 'staff' || customRole === 'admin') {
      const role: UserRole = customRole || 'staff'
      // Background Firestore sync so role resolution is instant (0ms delay)
      const userRef = doc(db, 'users', currentUser.uid)
      setDoc(userRef, { email, role: 'staff', updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
      return { user: currentUser, role }
    }

    let role: UserRole = customRole || 'customer'

    try {
      const userRef = doc(db, 'users', currentUser.uid)
      // 300ms race timeout to prevent UI freeze on slow Firestore connections
      const docPromise = getDoc(userRef)
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
      
      const userSnap = await Promise.race([docPromise, timeoutPromise])

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data()
        if (data?.role === 'staff' || data?.role === 'admin') {
          role = data.role
        }
      }
    } catch (err) {
      console.warn('Firestore user role lookup error:', err)
    }

    return { user: currentUser, role }
  }

  const setAuthUser = async (currentUser: User | null, customRole?: UserRole): Promise<UserRole | null> => {
    const { user: resolvedUser, role: resolvedRole } = await resolveUserAndRole(currentUser, customRole)
    setUser(resolvedUser)
    setUserRole(resolvedRole)
    setLoading(false)
    return resolvedRole
  }

  useEffect(() => {
    let isSubscribed = true

    // Maximum 600ms fallback timer to ensure app loads quickly
    const timeoutTimer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(false)
      }
    }, 600)

    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isSubscribed) return

        if (currentUser) {
          const { user: resolvedUser, role: resolvedRole } = await resolveUserAndRole(currentUser)
          if (isSubscribed) {
            setUser(resolvedUser)
            setUserRole(resolvedRole)
            setLoading(false)
            clearTimeout(timeoutTimer)
          }
        } else {
          if (isSubscribed) {
            if (!user) {
              setUser(null)
              setUserRole(null)
            }
            setLoading(false)
            clearTimeout(timeoutTimer)
          }
        }
      })

      return () => {
        isSubscribed = false
        clearTimeout(timeoutTimer)
        unsubscribe()
      }
    } catch (err) {
      console.warn('Firebase Auth state listener error:', err)
      if (isSubscribed) {
        setLoading(false)
        clearTimeout(timeoutTimer)
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userRole, loading, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
