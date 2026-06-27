"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { HeroContent } from "@/types"

// ── Per-product animated network visualization ──────────────────────────────

const NODES = [
  { x: 240, y: 180, main: true,  r: 10 },
  { x:  80, y:  75, main: false, r: 5  },
  { x: 370, y:  65, main: false, r: 4  },
  { x: 420, y: 210, main: false, r: 5  },
  { x: 340, y: 320, main: false, r: 4  },
  { x: 130, y: 310, main: false, r: 5  },
  { x:  55, y: 200, main: false, r: 4  },
  { x: 190, y:  60, main: false, r: 3  },
]

const EDGES = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,3],[4,5],[1,6],
]

// Status labels vary by seed so each product feels distinct
const STATUS_LABELS = [
  ["THROUGHPUT", "99.97 %", "UPTIME", "< 12 ms"],
  ["QUERIES / S",  "4,200",   "LATENCY",  "8 ms"   ],
  ["MODELS",       "14 live",  "DRIFT",   "0.02 %"  ],
  ["NODES",        "32",       "SYNC",    "100 %"   ],
]

function HeroViz({ seed }: { seed: number }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true })
  const labels = STATUS_LABELS[seed % STATUS_LABELS.length]

  return (
    <div
      ref={ref}
      className="relative w-full h-full min-h-[320px] border border-border/40 overflow-hidden"
    >
      {/* Corner marks */}
      <span className="absolute top-0 left-0  w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 left-0  w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 right-0 w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute top-0 right-0 w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 left-0  w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 left-0  w-px h-4 bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-4 h-px bg-amber/50 pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-px h-4 bg-amber/50 pointer-events-none" />

      <svg viewBox="0 0 480 370" fill="none" className="w-full h-full">
        {/* Grid */}
        {[80,160,240,320].map(y => (
          <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#F2843C" strokeWidth="0.3" opacity="0.06" />
        ))}
        {[80,160,240,320,400].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="370" stroke="#F2843C" strokeWidth="0.3" opacity="0.06" />
        ))}

        {/* Edges */}
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="#F2843C" strokeWidth="0.8"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.22 } : {}}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.07 }}
          />
        ))}

        {/* Satellite nodes */}
        {NODES.filter(n => !n.main).map((n, i) => (
          <motion.circle
            key={i} cx={n.x} cy={n.y} r={n.r}
            fill="#F2843C"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.55 } : {}}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
          />
        ))}

        {/* Main node — outer rings pulse */}
        {[44, 28].map((r, i) => (
          <motion.circle
            key={r} cx={NODES[0].x} cy={NODES[0].y} r={r}
            stroke="#F2843C" strokeWidth={i === 0 ? 0.4 : 0.8}
            fill="none"
            animate={inView ? { opacity: [0.12, 0, 0.12] } : { opacity: 0 }}
            transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        <motion.circle
          cx={NODES[0].x} cy={NODES[0].y} r="10"
          fill="#F2843C"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 0.95 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        <motion.text
          x={NODES[0].x + 14} y={NODES[0].y + 4}
          fontSize="7" fill="#F2843C" opacity="0.7" fontFamily="monospace"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 0.7 } : {}}
          transition={{ delay: 1.2 }}
        >
          CORE
        </motion.text>

        {/* Live indicator */}
        <motion.circle
          cx="455" cy="24" r="3.5" fill="#F2843C"
          animate={inView ? { opacity: [1, 0.2, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <text x="446" y="38" fontSize="6.5" fill="#F2843C" opacity="0.5"
          fontFamily="monospace" textAnchor="middle">
          LIVE
        </text>

        {/* Status bar */}
        <line x1="0" y1="340" x2="480" y2="340" stroke="#F2843C" strokeWidth="0.4" opacity="0.15" />
        {labels.map((label, i) => (
          <motion.text
            key={i}
            x={20 + i * 115} y="356"
            fontSize="7" fill="#F2843C"
            opacity={i % 2 === 0 ? 0.35 : 0.7}
            fontFamily="monospace"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: i % 2 === 0 ? 0.35 : 0.7 } : {}}
            transition={{ delay: 1.4 + i * 0.1 }}
          >
            {label}
          </motion.text>
        ))}
      </svg>
    </div>
  )
}

// ── Hero block ───────────────────────────────────────────────────────────────

interface Props {
  content: HeroContent
  vizSeed: number
}

export default function HeroBlock({ content, vizSeed }: Props) {
  return (
    <section className="w-full pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — text */}
        <div className="flex flex-col">
          {content.tags?.length > 0 && (
            <motion.div
              className="flex gap-3 mb-8 flex-wrap"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {content.tags.map(tag => (
                <span key={tag}
                  className="font-mono text-xs text-slate border border-border rounded px-2 py-1 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          <motion.h1
            className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[0.97]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {content.headline}
          </motion.h1>

          {content.subheadline && (
            <motion.p
              className="mt-4 font-display text-2xl text-amber font-semibold"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              {content.subheadline}
            </motion.p>
          )}

          <motion.div
            className="mt-5 rule-amber w-16"
            initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />

          <motion.p
            className="mt-6 text-base text-slate leading-relaxed max-w-lg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {content.description}
          </motion.p>
        </div>

        {/* Right — animated viz */}
        <motion.div
          className="w-full h-[340px] lg:h-[420px]"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroViz seed={vizSeed} />
        </motion.div>
      </div>
    </section>
  )
}
