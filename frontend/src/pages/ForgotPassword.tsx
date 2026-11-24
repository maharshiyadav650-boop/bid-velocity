import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [receivedCode, setReceivedCode] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      const res = await api.forgotPassword(email)
      setReceivedCode(res.resetCode)
      setCode(res.resetCode) // Auto-fill for user convenience
      setMsg(`Reset code generated: ${res.resetCode}. Enter a new password below.`)
      setStep('reset')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErr('Passwords do not match')
      return
    }
    setErr(''); setMsg(''); setBusy(true)
    try {
      await api.resetPassword({ email, code, newPassword })
      setMsg('Password updated successfully! Redirecting to sign in…')
      setTimeout(() => navigate('/login'), 2000)
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-5 py-16">
      <div className="text-center font-extrabold tracking-[.2em] text-slate-400 text-xs mb-2">BIDVELOCITY</div>
      <div className="rounded-2xl border border-line bg-panel p-7">
        <h1 className="text-xl font-extrabold m-0">Reset Password</h1>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          {step === 'request'
            ? 'Enter your account email to receive a password reset verification code.'
            : 'Enter the verification code and your new password.'}
        </p>

        {err && <p className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm">⛔ {err}</p>}
        {msg && <p className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm">✅ {msg}</p>}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Account Email</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 outline-none focus:border-acc text-white"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              disabled={busy}
              className="w-full py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50"
            >
              {busy ? 'Generating code…' : 'SEND RESET CODE'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400">6-Digit Verification Code</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 outline-none focus:border-acc text-white tracking-widest font-mono text-center text-lg"
                type="text"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                required
              />
              {receivedCode && (
                <div className="text-[11px] text-amber-300 mt-1">
                  Your verification code is: <b className="font-mono">{receivedCode}</b>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">New Password (min 8 characters)</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 outline-none focus:border-acc text-white"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400">Confirm New Password</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 outline-none focus:border-acc text-white"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button
              disabled={busy}
              className="w-full py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50"
            >
              {busy ? 'Updating…' : 'UPDATE PASSWORD'}
            </button>
            <button
              type="button"
              onClick={() => setStep('request')}
              className="w-full text-xs text-slate-400 hover:text-white"
            >
              ← Change email
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-line/60 text-center">
          <Link to="/login" className="text-xs font-bold text-acc hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
