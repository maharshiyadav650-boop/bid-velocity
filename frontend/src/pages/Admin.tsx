import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, money, API_BASE } from '../api'
import { useAuth } from '../auth'
import type { AdminStats, AdminBid, Auction, Payment, User } from '../types'

export default function Admin() {
  const user = useAuth(s => s.user)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'stats' | 'users' | 'auctions' | 'bids' | 'payments'>('users')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'SELLER' | 'USER'>('ALL')
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'CLOSED' | 'CANCELLED'>('ALL')
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const notify = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // Admin Data Queries
  const statsQuery = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: api.adminStats,
    enabled: !!user?.roles.includes('ADMIN'),
    refetchInterval: 10000,
  })

  const usersQuery = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: api.adminUsers,
    enabled: !!user?.roles.includes('ADMIN'),
  })

  const auctionsQuery = useQuery<Auction[]>({
    queryKey: ['admin-auctions'],
    queryFn: async () => {
      const p = await api.listAuctions({ size: 100 })
      return p.content || []
    },
    enabled: !!user?.roles.includes('ADMIN'),
  })

  const bidsQuery = useQuery<AdminBid[]>({
    queryKey: ['admin-bids'],
    queryFn: () => api.adminRecentBids(100),
    enabled: !!user?.roles.includes('ADMIN'),
    refetchInterval: 6000,
  })

  const paymentsQuery = useQuery<Payment[]>({
    queryKey: ['admin-payments'],
    queryFn: api.adminPayments,
    enabled: !!user?.roles.includes('ADMIN'),
  })

  // Mutations for Admin Actions
  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'ACTIVE' | 'SUSPENDED' }) => {
      return api.adminSetStatus(id, status)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setErr('')
      notify(`User #${vars.id} marked ${vars.status}`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const toggleUserRole = useMutation({
    mutationFn: async ({ id, currentRoles, roleToToggle }: { id: number; currentRoles: string[]; roleToToggle: 'SELLER' | 'ADMIN' }) => {
      let updated: string[]
      if (currentRoles.includes(roleToToggle)) {
        updated = currentRoles.filter(r => r !== roleToToggle)
      } else {
        updated = [...currentRoles, roleToToggle]
      }
      if (!updated.includes('USER')) updated.unshift('USER')
      return api.adminSetRoles(id, updated)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setErr('')
      notify(`User #${vars.id} roles updated`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const closeAuction = useMutation({
    mutationFn: async (id: number) => api.adminCloseAuction(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-auctions'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setErr('')
      notify(`Auction #${id} closed successfully`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const cancelAuction = useMutation({
    mutationFn: async (id: number) => api.cancelAuction(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-auctions'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setErr('')
      notify(`Auction #${id} cancelled`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const refundPayment = useMutation({
    mutationFn: async (id: number) => api.adminRefundPayment(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-payments'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setErr('')
      notify(`Payment #${id} refunded`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return (usersQuery.data ?? []).filter(u => {
      const q = userSearch.toLowerCase().trim()
      const matchesSearch = !q ||
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      const matchesRole = userRoleFilter === 'ALL' || u.roles.includes(userRoleFilter)
      return matchesSearch && matchesRole
    })
  }, [usersQuery.data, userSearch, userRoleFilter])

  // Filtered Auctions
  const filteredAuctions = useMemo(() => {
    return (auctionsQuery.data ?? []).filter(a => {
      if (auctionStatusFilter === 'ALL') return true
      if (auctionStatusFilter === 'LIVE') return a.status === 'LIVE' || a.status === 'ENDING'
      if (auctionStatusFilter === 'SCHEDULED') return a.status === 'SCHEDULED'
      if (auctionStatusFilter === 'CLOSED') return a.status === 'SOLD' || a.status === 'ENDED' || a.status === 'UNSOLD'
      if (auctionStatusFilter === 'CANCELLED') return a.status === 'CANCELLED'
      return true
    })
  }, [auctionsQuery.data, auctionStatusFilter])

  if (!user) {
    return (
      <main className="max-w-6xl mx-auto p-16 text-center">
        <div className="text-4xl mb-3">🛡️</div>
        <h2 className="text-2xl font-extrabold mb-2">Administrator Access Required</h2>
        <p className="text-slate-400 mb-5">Please sign in with administrator credentials.</p>
        <a href="#/login" className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-acc to-acc2 text-ink inline-block">
          Sign in as Admin →
        </a>
      </main>
    )
  }

  if (!user.roles.includes('ADMIN')) {
    return (
      <main className="max-w-6xl mx-auto p-16 text-center text-slate-400">
        <div className="text-4xl mb-3">🚫</div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Access Denied</h2>
        <p>Your account ({user.email}) does not hold administrative authority.</p>
      </main>
    )
  }

  const th = 'p-3 text-left text-[11px] uppercase tracking-wider text-slate-400 font-bold'
  const td = 'p-3 border-t border-line/60 text-sm align-middle'

  const statusChip = (s: string) => {
    const isGood = ['ACTIVE', 'SOLD', 'SUCCESS', 'LIVE'].includes(s)
    const isBad = ['SUSPENDED', 'FAILED', 'CANCELLED', 'UNSOLD', 'EXPIRED'].includes(s)
    const isWarn = ['ENDING', 'PENDING', 'PROCESSING', 'SCHEDULED'].includes(s)
    const colorClass = isGood
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30'
      : isBad
      ? 'text-rose-400 bg-rose-500/10 border-rose-400/30'
      : isWarn
      ? 'text-amber-300 bg-amber-500/10 border-amber-400/30'
      : 'text-slate-400 bg-slate-800 border-slate-700'
    return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wide ${colorClass}`}>{s}</span>
  }

  const stats = statsQuery.data

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl font-extrabold m-0 tracking-tight">Admin & Operations Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Superadmin
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 mb-0">
            Platform governance, role assignment, auction clearance, live bidding surveillance & financial settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => qc.invalidateQueries()}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 border border-line text-slate-300 hover:text-white hover:border-slate-500 transition flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh Platform
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {err && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⛔</span>
            <span>{err}</span>
          </div>
          <button onClick={() => setErr('')} className="text-xs font-bold text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-bold text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Platform Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">👥 Total Users</div>
          <div className="text-2xl font-black mt-1 text-white">{stats ? stats.totalUsers : '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats ? `${stats.activeUsers} active · ${stats.sellerCount} sellers` : 'fetching...'}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">⚡ Live Auctions</div>
          <div className="text-2xl font-black mt-1 text-amber-400">{stats ? stats.liveAuctions : '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats ? `${stats.totalAuctions} total · ${stats.closedAuctions} closed` : 'fetching...'}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🎯 Total Bids</div>
          <div className="text-2xl font-black mt-1 text-sky-400">{stats ? stats.totalBids : '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">real-time engine</div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">💰 Platform GMV</div>
          <div className="text-2xl font-black mt-1 text-emerald-400">{stats ? money(stats.totalGmv) : '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">settled volume</div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">💳 Settlements</div>
          <div className="text-2xl font-black mt-1 text-purple-400">{stats ? money(stats.settledPaymentsAmount) : '—'}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats ? `${stats.totalPayments} transactions` : 'fetching...'}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-line mb-5 overflow-x-auto">
        {[
          { id: 'users', label: '👥 User & Role Management', count: usersQuery.data?.length },
          { id: 'auctions', label: '⚡ Auction Moderation', count: auctionsQuery.data?.length },
          { id: 'bids', label: '📈 Live Bidding Feed', count: bidsQuery.data?.length },
          { id: 'payments', label: '💳 Financial Settlements', count: paymentsQuery.data?.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-5 py-3 text-sm font-extrabold border-b-2 -mb-px transition whitespace-nowrap flex items-center gap-2 ${
              tab === t.id
                ? 'border-acc text-white bg-slate-800/40 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t.label}</span>
            {t.count != null && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-acc/20 text-acc' : 'bg-slate-800 text-slate-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: User & Role Management */}
      {tab === 'users' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-panel p-3.5 rounded-2xl border border-line">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full bg-slate-800/60 border border-line rounded-xl px-3 py-1.5 text-sm outline-none focus:border-acc text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Role:</span>
              {(['ALL', 'ADMIN', 'SELLER', 'USER'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                    userRoleFilter === r
                      ? 'bg-acc/20 border-acc text-white'
                      : 'border-line text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className={th}>User</th>
                    <th className={th}>Email</th>
                    <th className={th}>Roles & Capabilities</th>
                    <th className={th}>Status</th>
                    <th className={th}>Auth Source</th>
                    <th className={th + ' text-right'}>Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                        No users matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isMe = u.id === user.id
                      const hasSeller = u.roles.includes('SELLER')
                      const hasAdmin = u.roles.includes('ADMIN')
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className={td}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-700 font-bold text-xs grid place-items-center text-slate-200">
                                {u.firstName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.firstName} {u.lastName}</span>
                                  {isMe && <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">You</span>}
                                </div>
                                <div className="text-[11px] text-slate-500">ID: #{u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className={td + ' font-mono text-xs text-slate-300'}>{u.email}</td>
                          <td className={td}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                USER
                              </span>
                              {/* Toggle Seller */}
                              <button
                                onClick={() => toggleUserRole.mutate({ id: u.id, currentRoles: u.roles, roleToToggle: 'SELLER' })}
                                title="Toggle SELLER privilege"
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                  hasSeller
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300'
                                    : 'border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400'
                                }`}
                              >
                                {hasSeller ? '✓ SELLER' : '+ SELLER'}
                              </button>
                              {/* Toggle Admin */}
                              <button
                                disabled={isMe}
                                onClick={() => toggleUserRole.mutate({ id: u.id, currentRoles: u.roles, roleToToggle: 'ADMIN' })}
                                title={isMe ? 'Cannot alter own admin role' : 'Toggle ADMIN privilege'}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                  hasAdmin
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/40'
                                    : 'border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400'
                                } ${isMe ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {hasAdmin ? '👑 ADMIN' : '+ ADMIN'}
                              </button>
                            </div>
                          </td>
                          <td className={td}>{statusChip(u.status)}</td>
                          <td className={td}>
                            <span className="text-[11px] font-mono text-slate-400">{u.provider || 'LOCAL'}</span>
                          </td>
                          <td className={td + ' text-right'}>
                            {isMe ? (
                              <span className="text-xs text-slate-600 italic">Self</span>
                            ) : u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => toggleUserStatus.mutate({ id: u.id, status: 'SUSPENDED' })}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-400 border border-rose-400/30 hover:bg-rose-500/20 transition"
                              >
                                Suspend User
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleUserStatus.mutate({ id: u.id, status: 'ACTIVE' })}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 border border-emerald-400/30 hover:bg-emerald-500/20 transition"
                              >
                                Restore Active
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Auction Moderation */}
      {tab === 'auctions' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 bg-panel p-3.5 rounded-2xl border border-line">
            <span className="text-xs font-bold text-slate-400 mr-2">Filter status:</span>
            {(['ALL', 'LIVE', 'SCHEDULED', 'CLOSED', 'CANCELLED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setAuctionStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                  auctionStatusFilter === s
                    ? 'bg-acc/20 border-acc text-white'
                    : 'border-line text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className={th}>Auction Details</th>
                    <th className={th}>Status</th>
                    <th className={th}>Current / Starting</th>
                    <th className={th}>Reserve</th>
                    <th className={th}>Bids</th>
                    <th className={th}>Seller</th>
                    <th className={th + ' text-right'}>Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                        No auctions matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAuctions.map(a => {
                      const canClose = ['LIVE', 'ENDING', 'SCHEDULED'].includes(a.status)
                      const canCancel = a.status !== 'CANCELLED' && a.status !== 'SOLD'
                      return (
                        <tr key={a.id} className="hover:bg-slate-800/30 transition">
                          <td className={td}>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{a.emoji || '📦'}</span>
                              <div>
                                <a href={`#/auction/${a.id}`} className="font-bold text-white hover:text-acc transition">
                                  {a.title}
                                </a>
                                <div className="text-[11px] text-slate-500">#{a.id} · {a.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className={td}>{statusChip(a.status)}</td>
                          <td className={td}>
                            <div className="font-extrabold text-white">{money(a.currentPrice)}</div>
                            <div className="text-[11px] text-slate-500">starts {money(a.startingPrice)}</div>
                          </td>
                          <td className={td}>
                            {a.reservePrice ? (
                              <span className="text-xs text-slate-300 font-mono">{money(a.reservePrice)}</span>
                            ) : (
                              <span className="text-xs text-slate-600">None</span>
                            )}
                          </td>
                          <td className={td}>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                              {a.bidCount} bids
                            </span>
                          </td>
                          <td className={td}>
                            <span className="text-xs text-slate-400 font-mono">User #{a.sellerId}</span>
                          </td>
                          <td className={td + ' text-right'}>
                            <div className="flex items-center justify-end gap-2">
                              {canClose && (
                                <button
                                  onClick={() => closeAuction.mutate(a.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 border border-amber-400/40 hover:bg-amber-500/20 transition"
                                >
                                  ⚡ Close Now
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => cancelAuction.mutate(a.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-400 border border-rose-400/40 hover:bg-rose-500/20 transition"
                                >
                                  🛑 Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Live Bidding Surveillance Feed */}
      {tab === 'bids' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between bg-panel p-3.5 rounded-2xl border border-line">
            <div>
              <h2 className="text-base font-extrabold m-0 text-white flex items-center gap-2">
                <span>📈 Real-Time Bid Surveillance Stream</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-0">
                Auditing high-frequency bid placements, anti-snipe triggers, and idempotency checks.
              </p>
            </div>
            <span className="text-xs text-slate-500">Auto-refreshing every 6s</span>
          </div>

          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className={th}>Bid ID</th>
                    <th className={th}>Target Auction</th>
                    <th className={th}>Bidder</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th}>Placement Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(bidsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                        No recent bids recorded on platform.
                      </td>
                    </tr>
                  ) : (
                    (bidsQuery.data ?? []).map(b => (
                      <tr key={b.id} className="hover:bg-slate-800/30 transition">
                        <td className={td + ' font-mono text-xs text-slate-400'}>#{b.id}</td>
                        <td className={td}>
                          <a href={`#/auction/${b.auctionId}`} className="font-bold text-white hover:text-acc transition">
                            {b.auctionTitle || `Auction #${b.auctionId}`}
                          </a>
                        </td>
                        <td className={td}>
                          <div className="font-bold text-slate-200">{b.bidderName || 'Bidder'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">User #{b.bidderId}</div>
                        </td>
                        <td className={td}>
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {money(b.amount)}
                          </span>
                        </td>
                        <td className={td}>{statusChip(b.status)}</td>
                        <td className={td + ' text-xs text-slate-400'}>
                          {b.acceptedAt ? new Date(b.acceptedAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Financial Settlements & Payments */}
      {tab === 'payments' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className={th}>Payment ID</th>
                    <th className={th}>Auction Reference</th>
                    <th className={th}>Winner</th>
                    <th className={th}>Seller</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th + ' text-right'}>Financial Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(paymentsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                        No settlement invoices or transactions yet.
                      </td>
                    </tr>
                  ) : (
                    (paymentsQuery.data ?? []).map(p => {
                      const canRefund = p.status === 'SUCCESS'
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition">
                          <td className={td + ' font-mono text-xs'}>#{p.id}</td>
                          <td className={td}>
                            <a href={`#/auction/${p.auctionId}`} className="font-bold text-white hover:text-acc">
                              {p.auctionTitle || `Auction #${p.auctionId}`}
                            </a>
                          </td>
                          <td className={td + ' text-xs text-slate-300'}>Winner #{p.winnerId}</td>
                          <td className={td + ' text-xs text-slate-400'}>Seller #{p.sellerId}</td>
                          <td className={td + ' font-extrabold text-white'}>{money(p.amount)}</td>
                          <td className={td}>{statusChip(p.status)}</td>
                          <td className={td + ' text-right'}>
                            {canRefund ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Confirm refund of ${money(p.amount)} for payment #${p.id}?`)) {
                                    refundPayment.mutate(p.id)
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 border border-amber-400/30 hover:bg-amber-500/20 transition"
                              >
                                Refund Transaction
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Service Infrastructure Status Footnote */}
      <footer className="mt-12 pt-6 border-t border-line/60 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
        <div>
          <span>Database: </span>
          <span className="text-emerald-400 font-bold">Neon Serverless PostgreSQL (production)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Backend APIs:</span>
          <a className="text-acc hover:underline font-mono" href={`${API_BASE}/actuator/health`} target="_blank" rel="noreferrer">
            /actuator/health
          </a>
          <span>·</span>
          <a className="text-acc hover:underline font-mono" href={`${API_BASE}/v3/api-docs`} target="_blank" rel="noreferrer">
            OpenAPI Docs
          </a>
        </div>
      </footer>
    </main>
  )
}
