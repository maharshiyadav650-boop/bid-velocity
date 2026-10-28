import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, money, uuid } from '../api'
import { useAuth } from '../auth'
import { useAuctionSocket } from '../useAuctionSocket'
import { Countdown, statusChip } from './Landing'
import PriceTrajectoryChart, { cleanBidderName } from '../components/PriceTrajectoryChart'
import type { Bid } from '../types'

export default function AuctionDetail() {
  const { id } = useParams()
  const aid = Number(id)
  const qc = useQueryClient()
  const user = useAuth(s => s.user)
  const [toast, setToast] = useState<{ msg: string; kind: string } | null>(null)

  const connected = useAuctionSocket(aid, (e) => {
    if (e.event?.startsWith('BID_ACCEPTED')) {
      setToast({ msg: `⚡ ${cleanBidderName(e.bidderName)} bid ${money(e.amount)}${e.event === 'BID_ACCEPTED_EXTENDED' ? ' — clock extended! ⏱' : ''}`, kind: 'ok' })
      qc.invalidateQueries({ queryKey: ['auction', aid] })
      qc.invalidateQueries({ queryKey: ['bids', aid] })
    }
    if (e.event === 'AUCTION_SEALED') {
      setToast({ msg: '🏁 Auction sealed — resolving winner', kind: 'ok' })
      setTimeout(() => qc.invalidateQueries({ queryKey: ['auction', aid] }), 1500)
    }
  })

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4200)
      return () => clearTimeout(t)
    }
  }, [toast])

  const { data: a } = useQuery({ queryKey: ['auction', aid], queryFn: () => api.getAuction(aid), refetchInterval: connected ? 6000 : 2500 })
  const { data: bids } = useQuery({ queryKey: ['bids', aid], queryFn: () => api.bidsFor(aid), refetchInterval: connected ? 6000 : 2500 })

  // Real-time dynamic live price and bid metrics derived from latest bids feed & auction projection
  const topBidAmount = bids && bids.length > 0 ? Number(bids[0].amount) : null
  const livePrice = topBidAmount !== null ? Math.max(Number(a?.currentPrice || 0), topBidAmount) : Number(a?.currentPrice || 0)
  const liveBidCount = Math.max(a?.bidCount || 0, bids?.length || 0)
  const minNext = livePrice > 0 ? (bids && bids.length > 0 ? livePrice + 1 : Number(a?.minNextBid || a?.startingPrice || 1)) : Number(a?.minNextBid || a?.startingPrice || 1)

  const [amount, setAmount] = useState<string>('')
  useEffect(() => {
    if (minNext > 0) {
      setAmount(prev => {
        const val = Number(prev)
        if (!val || val < minNext) {
          return String(minNext)
        }
        return prev
      })
    }
  }, [a?.id, minNext])

  const open = a && (a.status === 'LIVE' || a.status === 'ENDING')
  const topBidderId = bids && bids.length > 0 ? bids[0].bidderId : (a?.highestBidId ? bids?.find(b => b.id === a.highestBidId)?.bidderId : null)
  const iAmTop = !!(user && topBidderId === user.id)
  const recent = useMemo(() => (bids ?? []).slice(0, 12), [bids])

  // Winner and outcome metrics
  const winningBid = useMemo(() => {
    if (!bids || !bids.length) return null
    if (a?.highestBidId) {
      const found = bids.find(b => b.id === a.highestBidId)
      if (found) return found
    }
    return bids[0]
  }, [bids, a?.highestBidId])

  const winnerDisplayName = useMemo(() => {
    if (winningBid) return cleanBidderName(winningBid.bidderName)
    if (a?.winnerId) {
      if (user && user.id === a.winnerId) return 'You'
      return `Buyer #${a.winnerId}`
    }
    return 'Top Bidder'
  }, [winningBid, a?.winnerId, user])

  const startingPrice = Number(a?.startingPrice || 1)
  const hammerPrice = Number(a?.winningAmount ?? livePrice)
  const priceGain = Math.max(0, hammerPrice - startingPrice)
  const priceGainPct = startingPrice > 0 ? ((priceGain / startingPrice) * 100).toFixed(0) : '0'

  const heat = useMemo(() => {
    if (!a || !bids?.length) return []
    const start = +new Date(a.startTime), end = +new Date(a.endTime)
    const buckets = Array.from({ length: 14 }, () => 0)
    bids.forEach(b => {
      const t = (+new Date(b.at) - start) / Math.max(1, end - start)
      buckets[Math.min(13, Math.max(0, Math.floor(t * 14)))]++
    })
    const mx = Math.max(...buckets, 1)
    return buckets.map(v => v / mx)
  }, [a, bids])

  const prevTop = useRef(false)
  useEffect(() => {
    if (prevTop.current && !iAmTop && user) {
      setToast({ msg: '🔔 You have been OUTBID — place a higher bid!', kind: 'err' })
    }
    prevTop.current = iAmTop
  }, [iAmTop, user])

  const velocity = useMemo(() => {
    if (!bids?.length) return 0
    const cutoff = Date.now() - 60_000
    return bids.filter(b => +new Date(b.at) >= cutoff).length
  }, [bids])

  if (!a) {
    return <main className="max-w-6xl mx-auto p-10 text-slate-500">Loading auction… (is the auction service up?)</main>
  }

  const submit = async () => {
    if (!user) return setToast({ msg: 'Sign in with a buyer account to bid', kind: 'err' })
    try {
      const r = await api.placeBid({ auctionId: aid, amount: Number(amount), idempotencyKey: uuid() })
      setToast({ msg: `✅ Bid accepted at ${money(r.bid.amount)}${r.extended ? ' — anti-sniping extended the clock!' : ''}`, kind: 'ok' })
      qc.invalidateQueries({ queryKey: ['auction', aid] })
      qc.invalidateQueries({ queryKey: ['bids', aid] })
    } catch (e) {
      setToast({ msg: '⛔ ' + (e as Error).message, kind: 'err' })
      qc.invalidateQueries({ queryKey: ['auction', aid] })
      qc.invalidateQueries({ queryKey: ['bids', aid] })
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-5 pt-6 pb-16">
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl border text-sm font-semibold pop ${toast.kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-rose-500/10 border-rose-500/40 text-rose-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        {statusChip(a.status)}
        <span className="px-2.5 py-0.5 rounded-full border border-line text-slate-400">{a.category}</span>
        {a.antiSnipingEnabled && (
          <span className="px-2.5 py-0.5 rounded-full border border-line text-slate-400">
            🛡 anti-snipe +{a.extensionWindowSecs}s · {a.extensionCount}/{a.maxExtensions}
          </span>
        )}
        <span className={`px-2.5 py-0.5 rounded-full border ${connected ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-600 text-slate-500'}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${connected ? 'bg-good animate-pulse' : 'bg-slate-500'}`} />
          {connected ? 'LIVE FEED' : 'polling (socket down)'}
        </span>
        <button
          className="ml-auto px-3 py-1 rounded-lg border border-line text-slate-300 hover:border-acc hover:text-white transition"
          onClick={() => { navigator.clipboard.writeText(location.href) }}
        >
          🔗 Share
        </button>
      </div>

      {a.status === 'ENDING' && (
        <div className="alarm-banner mb-4 rounded-xl border px-4 py-2 text-center font-extrabold tracking-wide text-rose-200">
          🚨 FINAL MINUTE — BIDDING CLOSING · ANTI-SNIPE ARMED
        </div>
      )}

      {a.status === 'SOLD' && (
        <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-panel to-panel px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-emerald-200 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <div className="font-black text-sm text-white tracking-wide flex items-center gap-2">
                <span>AUCTION CONCLUDED — HAMMER HAS FALLEN</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user?.id === a.winnerId ? 'YOU WON' : 'SOLD'}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Winner: <b className="text-emerald-300">{winnerDisplayName}</b> · Final Hammer Price: <b className="text-white font-extrabold">{money(hammerPrice)}</b> (+{priceGainPct}% appreciation)
              </div>
            </div>
          </div>
          {user?.id === a.winnerId ? (
            <Link
              to="/payments"
              className="px-5 py-2 rounded-xl font-extrabold text-xs bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              💳 SETTLE PAYMENT ({money(hammerPrice)}) →
            </Link>
          ) : user?.id === a.sellerId ? (
            <Link
              to="/payments"
              className="px-4 py-2 rounded-xl font-bold text-xs border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition"
            >
              View Settlement Invoice →
            </Link>
          ) : (
            <span className="text-xs text-slate-400 border border-slate-700 rounded-lg px-3 py-1.5 bg-slate-800/40">
              Closed {new Date(a.endTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-line bg-panel/60 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 font-extrabold text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${a.status === 'SOLD' ? 'bg-emerald-400' : connected ? 'bg-good led-live' : 'bg-slate-500'}`} />
          {a.status === 'SOLD' ? 'CONCLUDED' : connected ? 'LIVE' : 'OFFLINE'}
        </span>
        <div><div className="text-[10px] text-slate-500 font-bold">BIDS</div><div className="font-extrabold tabular-nums">{liveBidCount}</div></div>
        <div><div className="text-[10px] text-slate-500 font-bold">VELOCITY</div><div className={`font-extrabold tabular-nums ${velocity >= 5 ? 'text-rose-300' : 'text-slate-200'}`}>{velocity}/min {velocity >= 5 ? '🔥' : ''}</div></div>
        <div><div className="text-[10px] text-slate-500 font-bold">{a.status === 'SOLD' ? 'HAMMER' : 'TOP BID'}</div><div className="font-extrabold tabular-nums glow">{money(hammerPrice)}</div></div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-slate-500 font-bold">{a.status === 'SOLD' ? 'AUCTION RESULT' : 'TIME LEFT'}</div>
          <div className={`text-lg font-extrabold tabular-nums ${a.status === 'ENDING' ? 'text-rose-300 blink-critical' : a.status === 'SOLD' ? 'text-emerald-400' : ''}`}>
            {a.status === 'SOLD' ? '🏆 SOLD' : <Countdown end={a.status === 'SCHEDULED' ? a.startTime : a.endTime} />}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-5">
        <div className="space-y-5">
          <div className={`rounded-2xl overflow-hidden border ${a.status === 'ENDING' ? 'border-amber-400/70' : a.status === 'SOLD' ? 'border-emerald-500/40' : 'border-line'}`}>
            <div className="relative h-72 grid place-items-center text-8xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
              {a.emoji}
              {a.imageUrl && (
                <img src={a.imageUrl} alt={a.title} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-5">
            <h1 className="text-xl font-extrabold m-0">{a.title}</h1>
            <p className="text-xs text-slate-500 mt-1 mb-3">by <b>{a.sellerId === user?.id ? 'you' : 'Seller ' + a.sellerId}</b> · optimistic-lock v{a.version}</p>
            <p className="text-sm text-slate-400">{a.description}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              {[
                ['Starting price', money(a.startingPrice)],
                ['Reserve', a.reservePrice ? money(a.reservePrice) : 'none'],
                ['Bids', String(liveBidCount)],
                ['Status', a.status]
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-800/40 p-2.5">
                  <div className="text-slate-500">{k}</div>
                  <div className="font-bold text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* High-Resolution Dynamic Price Trajectory Graph */}
          <PriceTrajectoryChart
            startingPrice={Number(a.startingPrice)}
            livePrice={hammerPrice}
            startTime={a.startTime}
            endTime={a.endTime}
            status={a.status}
            bids={bids ?? []}
          />
        </div>

        <div className="space-y-5">
          <div className={`rounded-2xl border p-5 ${a.status === 'ENDING' ? 'border-amber-400/70 animate-pulse' : a.status === 'SOLD' ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/25 via-panel to-panel shadow-lg' : 'border-line'} bg-panel`}>
            <div className="text-xs text-slate-500 font-bold">{a.status === 'SOLD' ? 'FINAL HAMMER PRICE' : 'CURRENT HIGHEST BID'}</div>
            <div className={`text-4xl font-extrabold led-pop glow ${a.status === 'ENDING' ? 'text-amber-300' : a.status === 'SOLD' ? 'text-emerald-400' : ''}`} key={hammerPrice}>
              {money(hammerPrice)}
            </div>
            {iAmTop && a.status !== 'SOLD' && <div className="text-good text-sm font-bold">🫵 You are the top bidder</div>}
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-slate-500 font-bold">{a.status === 'SCHEDULED' ? 'STARTS IN' : a.status === 'SOLD' ? 'CONCLUDED AT' : 'TIME REMAINING'}</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {a.status === 'SOLD' ? new Date(a.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <Countdown end={a.status === 'SCHEDULED' ? a.startTime : a.endTime} />}
              </span>
            </div>
            {a.status === 'ENDING' && <p className="text-amber-300/90 text-xs mt-2 mb-0">⚡ Under one minute. Anti-sniping may extend the clock.</p>}
            {(a.status === 'UNSOLD' || a.status === 'CANCELLED') && <p className="text-slate-400 text-sm mt-2 mb-0">Closed — {a.closeReason === 'RESERVE_NOT_MET' ? 'reserve not met' : a.closeReason === 'NO_BIDS' ? 'no valid bids' : a.status.toLowerCase()}.</p>}
          </div>

          {open ? (
            <div className="rounded-2xl border border-line bg-panel p-5">
              <h3 className="font-bold m-0 mb-2">Place your bid</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-slate-800/60 border border-line rounded-xl px-3 py-2.5 font-bold outline-none focus:border-acc"
                />
                <button onClick={submit} className="px-5 py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-acc to-acc2 text-ink btn-led">
                  BID NOW
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {[1, 10, 100].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setAmount(prev => {
                        const current = Number(prev)
                        const base = (current && current >= livePrice) ? current : livePrice
                        return String(base + d)
                      })
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-slate-300 hover:border-acc hover:text-white hover-lift"
                  >
                    + {money(d)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-slate-800/40 p-2.5">
                  <div className="text-slate-500">Current bid</div>
                  <b className="text-sm">{money(livePrice)}</b>
                </div>
                <div className="rounded-lg bg-slate-800/40 p-2.5">
                  <div className="text-slate-500">Minimum next</div>
                  <b className="text-sm">{money(minNext)}</b>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 mb-0">
                💡 Any bid above the current price is valid — even +₹1. Double-clicks can't create two bids (idempotency key).
              </p>
            </div>
          ) : a.status === 'SOLD' ? (
            /* Comprehensive Auction Outcome & Winner Showcase Card */
            <div className="rounded-2xl border border-emerald-500/40 bg-panel p-5 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Winner Header Banner */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-line/60">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {user?.id === a.winnerId ? 'YOU WON THIS AUCTION' : 'WINNER DECLARED'}
                    </span>
                    {user?.id === a.winnerId && <span className="text-xs">🎉</span>}
                  </div>
                  <h3 className="text-lg font-black text-white m-0 mt-1 truncate">
                    {user?.id === a.winnerId
                      ? 'Congratulations! You Won!'
                      : `Won by ${winnerDisplayName}`}
                  </h3>
                  <p className="text-xs text-slate-400 m-0 mt-0.5">
                    {user?.id === a.winnerId
                      ? 'Your bid was accepted as the winning offer. Settle payment below to complete purchase.'
                      : user?.id === a.sellerId
                        ? `Sold to ${winnerDisplayName} for ${money(hammerPrice)}. Payment invoice generated.`
                        : `Final hammer price settled at ${money(hammerPrice)}.`}
                  </p>
                </div>
              </div>

              {/* Outcome Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Winning Bidder</div>
                  <div className="font-extrabold text-sm text-emerald-300 truncate mt-0.5">
                    {user?.id === a.winnerId ? '🫵 You' : `👤 ${winnerDisplayName}`}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Hammer Price</div>
                  <div className="font-extrabold text-sm text-white mt-0.5">
                    {money(hammerPrice)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Price Surge</div>
                  <div className="font-extrabold text-sm text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span>▲</span> +{priceGainPct}%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Bids</div>
                  <div className="font-extrabold text-sm text-slate-200 mt-0.5">
                    {liveBidCount} bids placed
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Starting Floor</div>
                  <div className="font-semibold text-slate-300 mt-0.5">
                    {money(a.startingPrice)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-2.5 border border-line/40">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Closed At</div>
                  <div className="font-semibold text-slate-300 mt-0.5">
                    {new Date(a.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {user?.id === a.winnerId ? (
                <Link
                  to="/payments"
                  className="w-full block text-center py-3 px-4 rounded-xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition transform active:scale-[0.98] text-sm"
                >
                  💳 PROCEED TO PAYMENT ({money(hammerPrice)}) →
                </Link>
              ) : user?.id === a.sellerId ? (
                <Link
                  to="/payments"
                  className="w-full block text-center py-2.5 px-4 rounded-xl font-bold border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition text-xs"
                >
                  View Settlement Invoice Status →
                </Link>
              ) : (
                <div className="text-center py-1.5 text-xs text-slate-400 border-t border-line/40 pt-2.5">
                  🏁 Bidding closed · Item awarded to top bidder
                </div>
              )}
            </div>
          ) : (a.status === 'UNSOLD' || a.status === 'CANCELLED') ? (
            <div className="rounded-2xl border border-line bg-panel p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-300">
                <span className="text-2xl">⛔</span>
                <div>
                  <h3 className="font-bold text-sm text-white m-0">Auction Closed Without Sale</h3>
                  <p className="text-xs text-slate-400 m-0">
                    {a.closeReason === 'RESERVE_NOT_MET'
                      ? `Reserve price of ${money(a.reservePrice)} was not reached.`
                      : 'No qualifying bids were placed before the auction deadline.'}
                  </p>
                </div>
              </div>
              {user?.id === a.sellerId && (
                <Link
                  to="/sell"
                  className="w-full block text-center py-2 px-3 rounded-xl font-bold text-xs border border-line text-slate-300 hover:border-acc hover:text-white"
                >
                  Relist Item in Seller Studio →
                </Link>
              )}
            </div>
          ) : !user && (
            <div className="rounded-2xl border border-line bg-panel p-5 text-sm text-slate-400">
              <Link to="/login" className="text-acc font-bold">Sign in</Link> to bid when this auction opens.
            </div>
          )}

          <div className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="font-bold m-0 mb-2">Live bid activity</h3>
            {recent.length ? recent.map((b: Bid) => (
              <div
                key={b.id}
                className={`hover-lift flex justify-between py-2 px-2.5 rounded-lg text-sm border-b border-line/50 ${b.bidderId === user?.id ? 'bg-cyan-400/5 outline outline-1 outline-cyan-400/30' : ''}`}
              >
                <span>
                  {b.bidderId === user?.id ? '🫵 ' : ''}
                  {cleanBidderName(b.bidderName)}{' '}
                  <span className="text-slate-600 text-xs">· {new Date(b.at).toLocaleTimeString()}</span>
                </span>
                <b className="tabular-nums">{money(b.amount)}</b>
              </div>
            )) : (
              <p className="text-slate-500 text-sm m-0">No bids yet — open the floor.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
