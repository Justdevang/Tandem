import { useState } from 'react'
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth'

type AuthMode = 'login' | 'register'

export default function AuthScreen({ onGuestLogin }: { onGuestLogin?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'customer' | 'staff'>('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password, name, role)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Authentication method not enabled in Firebase Console. Please enable Email/Password in Firebase Console → Authentication → Sign-in method.')
      } else {
        setError(err.message || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Google Sign-In is not enabled in Firebase Console. Please enable Google in Firebase Console → Authentication → Sign-in method.')
      } else {
        setError(err.message || 'Google sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full bg-porcelain flex flex-col items-center justify-center font-sans px-6">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] tracking-[0.25em] text-steel uppercase">Restaurant OS</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-ink mt-1">Tandem</h1>
        </div>

        {/* Auth card */}
        <div className="border border-ink/10 rounded-lg p-6 bg-white">
          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 font-mono text-xs uppercase tracking-wide rounded-sm transition-colors ${
                mode === 'login' ? 'bg-ink text-porcelain' : 'text-ink/50 hover:text-ink'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 font-mono text-xs uppercase tracking-wide rounded-sm transition-colors ${
                mode === 'register' ? 'bg-ink text-porcelain' : 'text-ink/50 hover:text-ink'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-steel block mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-ink/15 rounded-sm px-3 py-2 text-sm bg-porcelain text-ink focus:outline-none focus:border-saffron transition-colors"
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-steel block mb-1">Role</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('customer')}
                      className={`flex-1 py-2 font-mono text-xs uppercase tracking-wide rounded-sm border transition-colors ${
                        role === 'customer'
                          ? 'border-saffron bg-saffron/10 text-saffron-deep'
                          : 'border-ink/15 text-ink/50'
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('staff')}
                      className={`flex-1 py-2 font-mono text-xs uppercase tracking-wide rounded-sm border transition-colors ${
                        role === 'staff'
                          ? 'border-herb bg-herb/10 text-herb'
                          : 'border-ink/15 text-ink/50'
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wide text-steel block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-ink/15 rounded-sm px-3 py-2 text-sm bg-porcelain text-ink focus:outline-none focus:border-saffron transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wide text-steel block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-ink/15 rounded-sm px-3 py-2 text-sm bg-porcelain text-ink focus:outline-none focus:border-saffron transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-brick bg-brick-light/40 border border-brick/30 p-2.5 rounded-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-porcelain py-3 rounded-sm font-mono text-xs uppercase tracking-wide hover:bg-steel-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 font-mono text-[10px] text-steel uppercase tracking-wide">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full border border-ink/15 text-ink py-3 rounded-sm font-mono text-xs uppercase tracking-wide hover:bg-porcelain transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {onGuestLogin && (
            <button
              type="button"
              onClick={onGuestLogin}
              className="w-full mt-3 bg-saffron/15 text-saffron font-semibold border border-saffron/40 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide hover:bg-saffron hover:text-ink transition-colors"
            >
              ⚡ Explore Demo App (Guest Mode)
            </button>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-steel mt-6 tracking-wide">
          Built for VibeAthon 6.0
        </p>
      </div>
    </div>
  )
}
