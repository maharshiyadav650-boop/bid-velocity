import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, money, uuid } from '../api'
import { useAuth } from '../auth'
import type { AdminStats, AdminBid, Auction, Payment, User } from '../types'

export default function Admin() {
  const user = useAuth(s => s.user)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'users' | 'auctions' | 'bids' | 'payments'>('users')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'SELLER' | 'USER'>('ALL')
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'CLOSED' | 'CANCELLED'>('ALL')
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateAuction, setShowCreateAuction] = useState(false)
  const [showPlaceBid, setShowPlaceBid] = useState(false)

  // Form states
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'USER' })
  const [newAuction, setNewAuction] = useState({
    title: '', description: '', category: 'Electronics', emoji: '⚡',
    startingPrice: '500', reservePrice: '', minIncrement: '50', durationMinutes: '120'
  })
  const [testBid, setTestBid] = useState({ auctionId: '', amount: '' })

  const notify = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4500)
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
      notify(`User #${vars.id} roles updated successfully`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      return api.adminCreateUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        roles: [data.role],
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setShowCreateUser(false)
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'USER' })
      notify(`User ${created.email} created successfully`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const createAuctionMutation = useMutation({
    mutationFn: async (f: typeof newAuction) => {
      const start = new Date()
      const end = new Date(Date.now() + Number(f.durationMinutes) * 60 * 1000)
      return api.createAuction({
        title: f.title,
        description: f.description || `Platform clearance listing for ${f.title}`,
        category: f.category,
        emoji: f.emoji || '⚡',
        startingPrice: Number(f.startingPrice),
        minIncrement: Number(f.minIncrement || 50),
        reservePrice: f.reservePrice ? Number(f.reservePrice) : null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        antiSnipingEnabled: true,
        extensionWindowSeconds: 30,
        maxExtensions: 3,
      })
    },
    onSuccess: (auc) => {
      qc.invalidateQueries({ queryKey: ['admin-auctions'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setShowCreateAuction(false)
      setNewAuction({
        title: '', description: '', category: 'Electronics', emoji: '⚡',
        startingPrice: '500', reservePrice: '', minIncrement: '50', durationMinutes: '120'
      })
      notify(`Auction "${auc.title}" launched successfully!`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  const placeBidMutation = useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: number; amount: number }) => {
      return api.placeBid({
        auctionId,
        amount,
        idempotencyKey: uuid(),
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-bids'] })
      qc.invalidateQueries({ queryKey: ['admin-auctions'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setShowPlaceBid(false)
      setTestBid({ auctionId: '', amount: '' })
      notify(`Bid placed: ${money(res.bid.amount)} on Auction #${res.bid.auctionId}`)
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
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-2xl font-extrabold mb-2 text-white">Restricted Area</h2>
        <p className="text-slate-400 mb-5">Authentication required to view this resource.</p>
        <a href="#/login" className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 border border-line text-white hover:border-slate-500 inline-block text-sm">
          Sign In →
        </a>
      </main>
    )
  }

  if (!user.roles.includes('ADMIN')) {
    return (
      <main className="max-w-6xl mx-auto p-16 text-center">
        <h1 className="text-6xl font-extrabold text-slate-700">404</h1>
        <p className="text-slate-400 mt-2">No route: this page lives in no registered service.</p>
        <a href="#/" className="text-acc font-bold text-sm inline-block mt-3">← Back to the arena</a>
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
            <h1 className="text-2xl font-extrabold m-0 tracking-tight text-white">Admin & Operations Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Superadmin
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 mb-0">
            Platform governance, user management, auction launching & clearance, live bidding surveillance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              qc.invalidateQueries()
              notify('Platform data refreshed')
            }}
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
            <div className="flex items-center gap-3">
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
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-acc to-acc2 text-ink text-xs flex items-center gap-1 shadow-sm hover:opacity-90 transition"
              >
                <span>➕</span> Create User
              </button>
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
                                {u.firstName ? u.firstName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.firstName || 'User'} {u.lastName}</span>
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-panel p-3.5 rounded-2xl border border-line">
            <div className="flex items-center gap-2">
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
            <button
              onClick={() => setShowCreateAuction(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-acc to-acc2 text-ink text-xs flex items-center gap-1 shadow-sm hover:opacity-90 transition"
            >
              <span>➕</span> Launch Auction
            </button>
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
                              <a
                                href={`#/auction/${a.id}`}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 border border-line hover:border-slate-500 transition"
                              >
                                View ↗
                              </a>
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
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Auto-refresh: 6s</span>
              <button
                onClick={() => setShowPlaceBid(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-acc to-acc2 text-ink text-xs flex items-center gap-1 shadow-sm hover:opacity-90 transition"
              >
                <span>🎯</span> Place Test Bid
              </button>
            </div>
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

      {/* MODAL 1: Create User */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-white">Create New Platform User</h3>
              <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                createUserMutation.mutate(newUser)
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400">First Name</label>
                  <input
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newUser.firstName}
                    onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Last Name</label>
                  <input
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newUser.lastName}
                    onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Email Address</label>
                <input
                  type="email"
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Temporary Password (min 8 characters)</label>
                <input
                  type="password"
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Primary Role</label>
                <select
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="USER">USER (Buyer)</option>
                  <option value="SELLER">SELLER (Buyer + Seller)</option>
                  <option value="ADMIN">ADMIN (Full Console Access)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-line text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-1/2 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Auction */}
      {showCreateAuction && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-white">Launch New Live Auction</h3>
              <button onClick={() => setShowCreateAuction(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                createAuctionMutation.mutate(newAuction)
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-400">Auction Title</label>
                <input
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  placeholder="e.g. Vintage Rolex Submariner"
                  value={newAuction.title}
                  onChange={e => setNewAuction({ ...newAuction, title: e.target.value })}
                  required
                  minLength={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400">Category</label>
                  <select
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newAuction.category}
                    onChange={e => setNewAuction({ ...newAuction, category: e.target.value })}
                  >
                    {['Electronics', 'Collectibles', 'Art', 'Vehicles', 'Fashion', 'Home', 'Gadgets', 'Luxury'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Emoji Icon</label>
                  <input
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newAuction.emoji}
                    onChange={e => setNewAuction({ ...newAuction, emoji: e.target.value })}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400">Starting Price ₹</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newAuction.startingPrice}
                    onChange={e => setNewAuction({ ...newAuction, startingPrice: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Reserve ₹ (opt)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="None"
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newAuction.reservePrice}
                    onChange={e => setNewAuction({ ...newAuction, reservePrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400">Duration (mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                    value={newAuction.durationMinutes}
                    onChange={e => setNewAuction({ ...newAuction, durationMinutes: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAuction(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-line text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAuctionMutation.isPending}
                  className="w-1/2 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50"
                >
                  {createAuctionMutation.isPending ? 'Launching…' : 'Launch Auction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Place Test Bid */}
      {showPlaceBid && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-white">Place Live Test Bid</h3>
              <button onClick={() => setShowPlaceBid(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                placeBidMutation.mutate({
                  auctionId: Number(testBid.auctionId),
                  amount: Number(testBid.amount),
                })
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-400">Target Auction</label>
                <select
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  value={testBid.auctionId}
                  onChange={e => {
                    const id = e.target.value
                    const found = (auctionsQuery.data ?? []).find(a => String(a.id) === id)
                    const min = found ? (found.currentPrice + found.minIncrement) : '100'
                    setTestBid({ auctionId: id, amount: String(min) })
                  }}
                  required
                >
                  <option value="">Select an auction…</option>
                  {(auctionsQuery.data ?? []).map(a => (
                    <option key={a.id} value={a.id}>
                      #{a.id} - {a.title} ({money(a.currentPrice)}, {a.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Bid Amount ₹</label>
                <input
                  type="number"
                  min="1"
                  className="w-full mt-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-acc"
                  value={testBid.amount}
                  onChange={e => setTestBid({ ...testBid, amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPlaceBid(false)}
                  className="w-1/2 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-line text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placeBidMutation.isPending || !testBid.auctionId}
                  className="w-1/2 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink disabled:opacity-50"
                >
                  {placeBidMutation.isPending ? 'Submitting…' : 'Submit Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
