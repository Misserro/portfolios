"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { HeroContent } from "@/types"

// ── Viz classification ────────────────────────────────────────────────────────
// Reads the product's actual content to decide which visualization type fits.

type VizType = "network" | "flow" | "dashboard" | "neural"

function classifyViz(
  tags: string[],
  headline: string,
  description: string,
  features: { title: string }[],
  steps: { title: string }[],
  stats: { label: string; value: string }[],
): VizType {
  const corpus = [...tags, headline, description, ...features.map(f => f.title)].join(" ").toLowerCase()
  if (/\b(ai|ml|model|learn|predict|neural|llm|generat|intelligen|machine|algorithm)\b/.test(corpus)) return "neural"
  if (steps.length >= 2 && /\b(pipeline|workflow|process|automat|stage|orchestrat|stream|flow)\b/.test(corpus)) return "flow"
  if (stats.length >= 2 || /\b(analytic|metric|dashboard|kpi|report|benchmark|perform|measure)\b/.test(corpus)) return "dashboard"
  return "network"
}

// ── Shared: animated status bar at the bottom of every viz ───────────────────

function StatusBar({ inView, label, value }: { inView: boolean; label: string; value: string }) {
  return (
    <>
      <line x1="0" y1="343" x2="480" y2="343" stroke="#F2843C" strokeWidth="0.4" opacity="0.15" />
      <motion.circle cx="22" cy="358" r="3.5" fill="#F2843C"
        animate={inView ? { opacity: [1, 0.2, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }} />
      <text x="32" y="362" fontSize="7" fill="#F2843C" opacity="0.4" fontFamily="monospace">LIVE</text>
      <motion.text x="110" y="362" fontSize="7" fill="#F2843C" fontFamily="monospace"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 0.35 } : {}}
        transition={{ delay: 1.5 }}>{label}</motion.text>
      <motion.text x="200" y="362" fontSize="7" fill="#F2843C" fontFamily="monospace"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 0.7 } : {}}
        transition={{ delay: 1.6 }}>{value}</motion.text>
    </>
  )
}

// ── VizNetwork: feature names as satellite nodes around a central hub ─────────

function VizNetwork({ features, inView }: { features: { title: string }[]; inView: boolean }) {
  const cx = 240, cy = 182
  const count = Math.min(Math.max(features.length, 3), 6)
  const r = 128

  const sats = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    // Labels derived from actual feature title — first 2 words, max 12 chars
    const label = features[i]?.title.split(/\s+/).slice(0, 2).join(" ").toUpperCase().slice(0, 12)
      ?? `NODE ${i + 1}`
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, label }
  })

  return (
    <svg viewBox="0 0 480 380" fill="none" className="w-full h-full">
      {[80, 160, 240, 320].map(y => (
        <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#F2843C" strokeWidth="0.3" opacity="0.05" />
      ))}
      {[120, 240, 360].map(x => (
        <line key={x} x1={x} y1="0" x2={x} y2="380" stroke="#F2843C" strokeWidth="0.3" opacity="0.05" />
      ))}

      {sats.map((s, i) => (
        <motion.line key={i} x1={cx} y1={cy} x2={s.x} y2={s.y}
          stroke="#F2843C" strokeWidth="0.8"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 0.2 } : {}}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }} />
      ))}
      {sats.map((s, i) => {
        // Push label away from center
        const dy = s.y > cy ? 18 : -10
        return (
          <g key={i}>
            <motion.circle cx={s.x} cy={s.y} r="5.5" fill="#F2843C"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 0.6 } : {}}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.07 }} />
            <motion.text x={s.x} y={s.y + dy} textAnchor="middle"
              fontSize="7.5" fill="#F2843C" fontFamily="monospace"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 0.5 } : {}}
              transition={{ delay: 0.9 + i * 0.07 }}>{s.label}</motion.text>
          </g>
        )
      })}

      {/* Pulsing rings on hub */}
      {[44, 26].map((rad, i) => (
        <motion.circle key={rad} cx={cx} cy={cy} r={rad}
          stroke="#F2843C" strokeWidth={i === 0 ? 0.4 : 0.8} fill="none"
          animate={inView ? { opacity: [0.13, 0, 0.13] } : { opacity: 0 }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.55 }} />
      ))}
      <motion.circle cx={cx} cy={cy} r="12" fill="#F2843C"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 0.9 } : {}}
        transition={{ delay: 0.25 }} />
      <motion.text x={cx + 16} y={cy + 4} fontSize="7" fill="#F2843C" fontFamily="monospace"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 0.6 } : {}}
        transition={{ delay: 1.1 }}>CORE</motion.text>

      <StatusBar inView={inView} label="NODES" value={`${count} active`} />
    </svg>
  )
}

// ── VizFlow: actual how-it-works steps as labeled boxes with flowing particles ─

function VizFlow({ steps, inView }: { steps: { title: string }[]; inView: boolean }) {
  const items = steps.slice(0, 4)
  const count = items.length
  const bw = Math.min(88, (420 - (count - 1) * 14) / count)
  const gap = (440 - count * bw) / (count + 1)

  const boxes = items.map((s, i) => ({
    x: 20 + gap + i * (bw + gap),
    y: 152,
    // First 2 words of step title, upper-case, max 12 chars
    label: s.title.split(/\s+/).slice(0, 2).join(" ").toUpperCase().slice(0, 12),
  }))

  return (
    <svg viewBox="0 0 480 380" fill="none" className="w-full h-full">
      <line x1="0" y1="171" x2="480" y2="171" stroke="#F2843C" strokeWidth="0.3" opacity="0.07" />

      {boxes.map((box, i) => (
        <g key={i}>
          <motion.rect x={box.x} y={box.y} width={bw} height="38" rx="2"
            stroke="#F2843C" strokeWidth="0.9" fill="#F2843C" fillOpacity="0.05"
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.12 }} />
          <motion.text x={box.x + bw / 2} y={box.y - 9}
            textAnchor="middle" fontSize="7" fill="#F2843C" fontFamily="monospace"
            initial={{ opacity: 0 }} animate={inView ? { opacity: 0.4 } : {}}
            transition={{ delay: 0.4 + i * 0.12 }}>
            {String(i + 1).padStart(2, "0")}
          </motion.text>
          <motion.text x={box.x + bw / 2} y={box.y + 22}
            textAnchor="middle" fontSize="7.5" fill="#F2843C" fontFamily="monospace"
            initial={{ opacity: 0 }} animate={inView ? { opacity: 0.7 } : {}}
            transition={{ delay: 0.5 + i * 0.12 }}>{box.label}</motion.text>

          {i < boxes.length - 1 && (<>
            <motion.line
              x1={box.x + bw + 4} y1="171" x2={boxes[i + 1].x - 4} y2="171"
              stroke="#F2843C" strokeWidth="0.9"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 0.3 } : {}}
              transition={{ delay: 0.65 + i * 0.12 }} />
            {/* Arrow head */}
            <motion.path
              d={`M ${boxes[i + 1].x - 9} 167 L ${boxes[i + 1].x - 4} 171 L ${boxes[i + 1].x - 9} 175`}
              stroke="#F2843C" strokeWidth="1" fill="none"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 0.3 } : {}}
              transition={{ delay: 0.65 + i * 0.12 }} />
            {/* Animated particle */}
            <motion.circle r="3" fill="#F2843C"
              animate={inView ? {
                cx: [box.x + bw + 4, boxes[i + 1].x - 4],
                cy: [171, 171],
                opacity: [0, 0.85, 0],
              } : {}}
              transition={{ duration: 1.1, repeat: Infinity, delay: 1.1 + i * 0.38, ease: "linear" }} />
          </>)}
        </g>
      ))}

      <StatusBar inView={inView} label="PIPELINE" value={`${count} stages`} />
    </svg>
  )
}

// ── VizDashboard: actual stat values rendered as an animated bar chart ────────

function VizDashboard({ stats, inView }: { stats: { label: string; value: string }[]; inView: boolean }) {
  const items = stats.slice(0, 6)

  // Extract numeric value; normalize to 0–200px height relative to max
  const nums = items.map(s => {
    const n = parseFloat(s.value.replace(/[^0-9.]/g, ""))
    return isNaN(n) ? 0 : n
  })
  const max = Math.max(...nums, 1)
  const heights = nums.map(n => Math.max(18, Math.round((n / max) * 210)))

  const bw = Math.min(54, (380 - (items.length - 1) * 12) / items.length)
  const total = items.length * bw + (items.length - 1) * 12
  const startX = (480 - total) / 2
  const baseline = 288

  return (
    <svg viewBox="0 0 480 380" fill="none" className="w-full h-full">
      {/* Y-axis reference lines */}
      {[0, 50, 100].map(pct => {
        const y = baseline - (pct / 100) * 210
        return (
          <g key={pct}>
            <line x1="38" y1={y} x2="442" y2={y} stroke="#F2843C"
              strokeWidth="0.3" strokeDasharray={pct ? "3 5" : "0"} opacity="0.1" />
            <text x="34" y={y + 3} textAnchor="end" fontSize="6.5"
              fill="#F2843C" opacity="0.3" fontFamily="monospace">
              {Math.round(max * pct / 100)}
            </text>
          </g>
        )
      })}
      <line x1="38" y1={baseline} x2="442" y2={baseline}
        stroke="#F2843C" strokeWidth="0.8" opacity="0.2" />

      {items.map((item, i) => {
        const x = startX + i * (bw + 12)
        const h = heights[i]
        const peak = h === Math.max(...heights)
        return (
          <g key={i}>
            {/* Bar — animate y and height from baseline */}
            <motion.rect x={x} y={baseline} width={bw} height={0} rx="1"
              fill="#F2843C" fillOpacity={peak ? 0.72 : 0.18}
              stroke="#F2843C" strokeOpacity={peak ? 0.55 : 0.2} strokeWidth="0.7"
              animate={inView ? { y: baseline - h, height: h } : { y: baseline, height: 0 }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.09, ease: "easeOut" }} />
            {/* X label */}
            <motion.text x={x + bw / 2} y={baseline + 13} textAnchor="middle"
              fontSize="7" fill="#F2843C" fontFamily="monospace"
              initial={{ opacity: 0 }} animate={inView ? { opacity: 0.45 } : {}}
              transition={{ delay: 0.7 + i * 0.09 }}>
              {item.label.toUpperCase().slice(0, 8)}
            </motion.text>
            {/* Value above bar */}
            <motion.text x={x + bw / 2} y={baseline - h - 6} textAnchor="middle"
              fontSize={peak ? 9 : 7.5} fontWeight={peak ? "bold" : "normal"}
              fill="#F2843C" fontFamily="monospace"
              initial={{ opacity: 0 }} animate={inView ? { opacity: peak ? 0.95 : 0.55 } : {}}
              transition={{ delay: 0.9 + i * 0.09 }}>
              {item.value}
            </motion.text>
          </g>
        )
      })}

      <StatusBar inView={inView} label="METRICS" value={`${items.length} tracked`} />
    </svg>
  )
}

// ── VizNeural: feature names as input layer in a 3-layer neural network ───────

function VizNeural({ features, inView }: { features: { title: string }[]; inView: boolean }) {
  const inputCount  = Math.min(Math.max(features.length, 3), 5)
  const hiddenCount = inputCount + 1
  const outputCount = 2

  const LAYERS = [
    { x: 72,  count: inputCount  },
    { x: 240, count: hiddenCount },
    { x: 400, count: outputCount },
  ]

  function layerNodes(li: number) {
    const { x, count } = LAYERS[li]
    const spacing = Math.min(54, 260 / Math.max(count - 1, 1))
    const top = 185 - ((count - 1) * spacing) / 2
    return Array.from({ length: count }, (_, i) => ({ x, y: top + i * spacing }))
  }

  const allNodes = LAYERS.map((_, li) => layerNodes(li))

  // Edges: each node in layer N → every node in layer N+1
  type Edge = [number, number, number, number]
  const edges: Edge[] = []
  allNodes.slice(0, -1).forEach((layer, li) => {
    layer.forEach(n => {
      allNodes[li + 1].forEach(m => {
        edges.push([n.x, n.y, m.x, m.y])
      })
    })
  })

  return (
    <svg viewBox="0 0 480 380" fill="none" className="w-full h-full">
      {/* Layer labels */}
      {["INPUT", "HIDDEN", "OUTPUT"].map((lbl, li) => (
        <text key={lbl} x={LAYERS[li].x} y="42" textAnchor="middle"
          fontSize="7" fill="#F2843C" opacity="0.3" fontFamily="monospace">{lbl}</text>
      ))}
      {LAYERS.map(({ x }, li) => (
        <line key={li} x1={x} y1="50" x2={x} y2="320"
          stroke="#F2843C" strokeWidth="0.3" opacity="0.07" />
      ))}

      {/* Edges */}
      {edges.map(([x1, y1, x2, y2], i) => (
        <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#F2843C" strokeWidth="0.45"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 0.11 } : {}}
          transition={{ duration: 0.3, delay: 0.2 + i * 0.007 }} />
      ))}

      {/* Nodes + labels */}
      {allNodes.map((layer, li) => layer.map((n, ni) => {
        const isOutput = li === 2
        const label = li === 0
          ? (features[ni]?.title.split(/\s+/)[0] ?? `IN ${ni + 1}`).toUpperCase().slice(0, 9)
          : li === 2 ? (["RESULT", "SCORE"][ni] ?? `OUT ${ni}`)
          : undefined
        return (
          <g key={`${li}-${ni}`}>
            <motion.circle cx={n.x} cy={n.y} r={isOutput ? 9 : 5.5}
              fill="#F2843C" fillOpacity={isOutput ? 0.85 : 0.55}
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.4 + li * 0.15 + ni * 0.04 }} />
            {label && li === 0 && (
              <motion.text x={n.x - 14} y={n.y + 3} textAnchor="end"
                fontSize="7" fill="#F2843C" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={inView ? { opacity: 0.45 } : {}}
                transition={{ delay: 0.6 + ni * 0.04 }}>{label}</motion.text>
            )}
            {label && li === 2 && (
              <motion.text x={n.x + 14} y={n.y + 3} textAnchor="start"
                fontSize="7" fill="#F2843C" fontFamily="monospace"
                initial={{ opacity: 0 }} animate={inView ? { opacity: 0.55 } : {}}
                transition={{ delay: 0.9 }}>{label}</motion.text>
            )}
          </g>
        )
      }))}

      {/* Signal pulse through first path */}
      {allNodes[0][0] && allNodes[1][0] && allNodes[2][0] && (
        <motion.circle r="3.5" fill="#F2843C" opacity="0.9"
          animate={inView ? {
            cx: [allNodes[0][0].x, allNodes[1][0].x, allNodes[2][0].x],
            cy: [allNodes[0][0].y, allNodes[1][0].y, allNodes[2][0].y],
            opacity: [0, 0.9, 0.9, 0],
          } : {}}
          transition={{ duration: 1.6, repeat: Infinity, delay: 1.4, ease: "linear" }} />
      )}

      <StatusBar inView={inView} label="MODEL" value={`${inputCount} inputs`} />
    </svg>
  )
}

// ── Outer viz container with corner marks ─────────────────────────────────────

function HeroViz({
  content,
  features,
  steps,
  stats,
}: {
  content: HeroContent
  features: { title: string; description: string }[]
  steps: { title: string }[]
  stats: { label: string; value: string }[]
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const type = classifyViz(content.tags ?? [], content.headline, content.description, features, steps, stats)

  return (
    <div ref={ref} className="relative w-full h-full min-h-[320px] border border-border/50 overflow-hidden">
      <span className="absolute top-0 left-0  w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 left-0  w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 right-0 w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 right-0 w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 left-0  w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 left-0  w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-px h-4 bg-amber/50 pointer-events-none" />

      {type === "network"   && <VizNetwork   features={features} inView={inView} />}
      {type === "flow"      && <VizFlow      steps={steps}       inView={inView} />}
      {type === "dashboard" && <VizDashboard stats={stats}       inView={inView} />}
      {type === "neural"    && <VizNeural    features={features} inView={inView} />}
    </div>
  )
}

// ── Hero block ─────────────────────────────────────────────────────────────────

interface Props {
  content: HeroContent
  features?: { title: string; description: string }[]
  steps?:    { title: string }[]
  stats?:    { label: string; value: string }[]
}

export default function HeroBlock({ content, features = [], steps = [], stats = [] }: Props) {
  return (
    <section className="w-full pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — text */}
        <div className="flex flex-col">
          {content.tags?.length > 0 && (
            <motion.div className="flex gap-3 mb-8 flex-wrap"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              {content.tags.map(tag => (
                <span key={tag} className="font-mono text-xs text-slate border border-border px-2 py-1 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          <motion.h1
            className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[0.97]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}>
            {content.headline}
          </motion.h1>

          {content.subheadline && (
            <motion.p className="mt-4 font-display text-2xl text-amber font-semibold"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}>
              {content.subheadline}
            </motion.p>
          )}

          <motion.div className="mt-5 rule-amber w-16"
            initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }} />

          <motion.p className="mt-6 text-base text-slate leading-relaxed max-w-lg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}>
            {content.description}
          </motion.p>
        </div>

        {/* Right — product-specific animated viz */}
        <motion.div className="w-full h-[340px] lg:h-[420px]"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <HeroViz content={content} features={features} steps={steps} stats={stats} />
        </motion.div>
      </div>
    </section>
  )
}
