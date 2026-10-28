import { useMemo, useState } from 'react'
import { money } from '../api'
import type { Bid } from '../types'

export const cleanBidderName = (name?: string) => {
  if (!name) return 'Bidder'
  let n = name.trim()
  if (n.includes('@')) {
    n = n.split('@')[0]
  }
  n = n.replace(/\s*•\d+$/, '')
  return n.charAt(0).toUpperCase() + n.slice(1)
}

interface PriceTrajectoryChartProps {
  startingPrice: number
  livePrice: number
  startTime: string
  endTime: string
  status: string
  bids: Bid[]
}

interface Point {
  x: number
  y: number
  time: number
  price: number
  bidder: string
  timeStr: string
  gainFromPrev?: number
  isStart?: boolean
  isLatest?: boolean
}

export default function PriceTrajectoryChart({
  startingPrice,
  livePrice,
  startTime,
  endTime,
  status,
  bids
}: PriceTrajectoryChartProps) {
  const [hovered, setHovered] = useState<Point | null>(null)

  const chronologicalBids = useMemo(() => {
    if (!bids || !bids.length) return []
    return [...bids].sort((a, b) => +new Date(a.at) - +new Date(b.at))
  }, [bids])

  // Chart Dimensions
  const svgWidth = 600
  const svgHeight = 210
  const left = 75
  const right = 25
  const top = 22
  const bottom = 32
  const plotW = svgWidth - left - right
  const plotH = svgHeight - top - bottom

  // Domain math
  const t0 = new Date(startTime).getTime()
  const latestBidTime = chronologicalBids.length
    ? Math.max(...chronologicalBids.map(b => new Date(b.at).getTime()))
    : t0
  const tEnd = status === 'SOLD'
    ? new Date(endTime).getTime()
    : Math.max(Date.now(), latestBidTime, t0 + 60000)
  const tSpan = Math.max(60000, tEnd - t0)

  const minP = Math.max(1, Number(startingPrice) || 1)
  const maxP = Math.max(minP, Number(livePrice) || minP, ...chronologicalBids.map(b => Number(b.amount)))
  const pSpan = maxP - minP
  const topBuffer = pSpan > 0 ? pSpan * 0.12 : 50
  const bottomBuffer = pSpan > 0 ? pSpan * 0.05 : 10
  const domainMax = maxP + topBuffer
  const domainMin = Math.max(0, minP - bottomBuffer)
  const domainSpan = Math.max(1, domainMax - domainMin)

  const mapX = (t: number) => left + Math.max(0, Math.min(plotW, ((t - t0) / tSpan) * plotW))
  const mapY = (p: number) => top + plotH - ((p - domainMin) / domainSpan) * plotH

  // Build points
  const points: Point[] = useMemo(() => {
    const list: Point[] = [
      {
        x: mapX(t0),
        y: mapY(minP),
        time: t0,
        price: minP,
        bidder: 'Listing Floor',
        timeStr: new Date(t0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStart: true
      }
    ]

    chronologicalBids.forEach((b, idx) => {
      const prevPrice = idx === 0 ? minP : Number(chronologicalBids[idx - 1].amount)
      const t = new Date(b.at).getTime()
      const amt = Number(b.amount)
      list.push({
        x: mapX(t),
        y: mapY(amt),
        time: t,
        price: amt,
        bidder: cleanBidderName(b.bidderName),
        timeStr: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        gainFromPrev: amt - prevPrice,
        isLatest: idx === chronologicalBids.length - 1
      })
    })

    return list
  }, [t0, minP, chronologicalBids, mapX, mapY])

  // Final point extension on X axis
  const finalX = mapX(tEnd)
  const lastPoint = points[points.length - 1]

  // Construct step ladder path
  let stepPath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const curr = points[i]
    const prev = points[i - 1]
    stepPath += ` L ${curr.x.toFixed(1)} ${prev.y.toFixed(1)} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`
  }
  if (finalX > lastPoint.x) {
    stepPath += ` L ${finalX.toFixed(1)} ${lastPoint.y.toFixed(1)}`
  }

  const bottomY = (top + plotH).toFixed(1)
  const pathEndX = Math.max(finalX, lastPoint.x).toFixed(1)
  const areaPath = `${stepPath} L ${pathEndX} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`

  // Surge stats
  const priceGain = Math.max(0, maxP - minP)
  const pctGain = minP > 0 ? ((priceGain / minP) * 100).toFixed(0) : '0'

  // Mid price reference
  const midP = (minP + maxP) / 2

  // Active display point (hovered or latest)
  const activePoint = hovered || (points.length > 1 ? lastPoint : null)

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 space-y-3">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold m-0 text-white flex items-center gap-1.5">
              <span>📈</span> Live Price Trajectory
            </h3>
            {status === 'LIVE' || status === 'ENDING' ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LIVE
              </span>
            ) : status === 'SOLD' ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                🏆 FINAL HAMMER
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-line">
                {status}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 m-0 mt-0.5">
            {chronologicalBids.length ? `${chronologicalBids.length} accepted bid steps over auction lifetime` : 'Awaiting first bid to start the price staircase'}
          </p>
        </div>

        {/* Top Stats */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Price Surge</div>
            <div className="text-sm font-extrabold text-emerald-400 flex items-center gap-1 justify-end">
              <span>▲</span> +{pctGain}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Elevation</div>
            <div className="text-sm font-extrabold text-white">
              +{money(priceGain)}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Hover/Latest Info Banner */}
      <div className="h-9 px-3 rounded-xl bg-slate-800/40 border border-line/60 flex items-center justify-between text-xs">
        {activePoint ? (
          <>
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-400">Step:</span>
              <b className="text-white font-extrabold tabular-nums">{money(activePoint.price)}</b>
              <span className="text-slate-500">by</span>
              <span className="text-cyan-300 font-bold">{activePoint.bidder}</span>
              <span className="text-slate-500 text-[11px]">· {activePoint.timeStr}</span>
            </div>
            {activePoint.gainFromPrev && activePoint.gainFromPrev > 0 && (
              <span className="text-emerald-400 font-bold text-[11px] shrink-0">
                +{money(activePoint.gainFromPrev)} step jump
              </span>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-xs">
            Listing Floor: <b className="text-slate-300">{money(minP)}</b> · Hover any bid dot for details
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/40 border border-line/40 pt-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
          style={{ minHeight: '180px' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Reference Gridlines & Y-Axis Labels */}
          {/* Top Line */}
          <line
            x1={left}
            y1={mapY(maxP)}
            x2={left + plotW}
            y2={mapY(maxP)}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="4 4"
          />
          <text
            x={left - 8}
            y={mapY(maxP) + 4}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#38bdf8"
          >
            {money(maxP)}
          </text>

          {/* Mid Line */}
          {pSpan > 0 && (
            <>
              <line
                x1={left}
                y1={mapY(midP)}
                x2={left + plotW}
                y2={mapY(midP)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="4 4"
              />
              <text
                x={left - 8}
                y={mapY(midP) + 4}
                textAnchor="end"
                fontSize="9"
                fill="#64748b"
              >
                {money(midP)}
              </text>
            </>
          )}

          {/* Baseline */}
          <line
            x1={left}
            y1={mapY(minP)}
            x2={left + plotW}
            y2={mapY(minP)}
            stroke="rgba(255,255,255,0.12)"
          />
          <text
            x={left - 8}
            y={mapY(minP) + 4}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#94a3b8"
          >
            {money(minP)}
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Step Line */}
          <path
            d={stepPath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowFilter)"
          />

          {/* X-Axis Time Labels */}
          <text
            x={left}
            y={svgHeight - 10}
            fontSize="10"
            fill="#64748b"
            fontWeight="600"
          >
            {new Date(t0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Start)
          </text>
          <text
            x={left + plotW}
            y={svgHeight - 10}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
            fontWeight="600"
          >
            {status === 'SOLD' ? 'Concluded' : 'Now'} · {new Date(tEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>

          {/* Interactive Bid Nodes */}
          {points.map((pt, i) => {
            const isLatest = i === points.length - 1 && !pt.isStart
            const isHovered = hovered === pt
            return (
              <g
                key={i}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hitbox */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Latest pulsing radar ring */}
                {isLatest && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    className="animate-ping opacity-60"
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : pt.isStart ? 3.5 : isLatest ? 5.5 : 4}
                  fill={isLatest ? '#38bdf8' : pt.isStart ? '#64748b' : '#06b6d4'}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

