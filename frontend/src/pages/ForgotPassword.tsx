import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [slowServerNotice, setSlowServerNotice] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let t: any
    if (busy) {
      t = setTimeout(() => setSlowServerNotice(true), 2500)
    } else {
      setSlowServerNotice(false)
    }
    return () => clearTimeout(t)
  }, [busy])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      const res = await api.forgotPassword(email)
      setMaskedEmail(res.maskedEmail || email)
      setMsg(res.message || 'Verification code dispatched to your email!')
      setStep('reset')
      setCooldown(30)
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
      await api.resetPassword({ email, code: code.trim(), newPassword })
      setMsg('✅ Identity verified and password updated successfully! Redirecting to sign in…')
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
      <div className="rounded-2xl border border-line bg-panel p-7 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-acc/20 to-acc2/20 border border-acc/30 flex items-center justify-center text-xl">
            {step === 'request' ? '🔑' : '✉️'}
          </div>
          <h1 className="text-xl font-extrabold m-0 text-white">
            {step === 'request' ? 'Forgot Password' : 'Email Verification'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            {step === 'request'
              ? 'Enter your registered Gmail or email address to receive a 6-digit verification code.'
              : `We dispatched a 6-digit verification code to ${maskedEmail || 'your email'}.`}
          </p>
        </div>

        {err && <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2"><span>⛔</span><span>{err}</span></div>}
        {msg && <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2"><span>✅</span><span>{msg}</span></div>}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Account Email (Gmail / Personal)</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3.5 py-2.5 outline-none focus:border-acc text-white text-sm"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              disabled={busy}
              className="w-full py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50 text-xs tracking-wider transition"
            >
              {busy ? 'DISPATCHING EMAIL…' : 'SEND VERIFICATION CODE →'}
            </button>
            {slowServerNotice && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center animate-pulse">
                ⏳ Connecting to server… If server was idle, Render is waking up (~30s). Please hold on!
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-slate-800/40 border border-line/60 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-400">Verification code sent to</span>
              <div className="font-mono text-sm font-bold text-acc mt-0.5">{maskedEmail}</div>
              <p className="text-[10px] text-slate-500 mt-1 mb-0">Check your inbox and spam/junk folder</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">6-Digit Verification Code</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 outline-none focus:border-acc text-white tracking-[.3em] font-mono text-center text-xl font-bold"
                type="text"
                placeholder="••••••"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">New Password (min 8 characters)</label>
              <input
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-acc"
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
                className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-acc"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button
              disabled={busy || code.length !== 6}
              className="w-full py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50 text-xs tracking-wider transition"
            >
              {busy ? 'VERIFYING…' : 'VERIFY CODE & RESET PASSWORD'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-slate-400 hover:text-white transition"
              >
                ← Different email
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={() => handleRequest()}
                className={`font-semibold transition ${cooldown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-acc hover:underline'}`}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
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
