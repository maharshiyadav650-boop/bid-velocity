import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function AuthCallback() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { init } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fullHash = window.location.hash
    // Expected patterns: #/auth/callback#token=... or #/auth/callback?token=... or #token=...
    const tokenMatch = fullHash.match(/[#?&]token=([^&]+)/)
    const errorMatch = fullHash.match(/[#?&]error=([^&]+)/)

    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1])
      localStorage.setItem('bv.token', token)
      init().then(() => {
        navigate('/auctions', { replace: true })
      })
    } else if (errorMatch) {
      const err = decodeURIComponent(errorMatch[1])
      const readable =
        err === 'google_email_unverified'
          ? 'Your Google account email is not verified. Please verify your Google email and try again.'
          : err === 'unexpected_principal'
          ? 'Unexpected login response from Google identity provider.'
          : `Authentication failed: ${err}`
      setErrorMsg(readable)
    } else {
      setErrorMsg('No authentication token received from Google provider.')
    }
  }, [init, navigate])

  if (errorMsg) {
    return (
      <main className="max-w-md mx-auto px-5 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/30 bg-panel p-7">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-xl font-extrabold text-rose-300">Sign-in Notice</h1>
          <p className="text-sm text-slate-400 mt-2 mb-6">{errorMsg}</p>
          <div className="flex flex-col gap-2">
            <Link to="/login" className="px-4 py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink">
              Back to Sign in
            </Link>
            <Link to="/" className="text-xs text-slate-500 hover:text-white">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="rounded-2xl border border-line bg-panel p-7">
        <div className="w-8 h-8 mx-auto border-2 border-acc border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Completing authentication…</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying your Google session with BidVelocity</p>
      </div>
    </main>
  )
}
