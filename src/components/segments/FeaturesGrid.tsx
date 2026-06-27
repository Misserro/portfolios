"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { FeaturesContent } from "@/types"

// 8 cycling abstract amber icons (24×24 viewBox)
function FeatureIcon({ index }: { index: number }) {
  const type = index % 8

  const icons: Record<number, React.ReactNode> = {
    0: ( // Lightning — speed/performance
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M13 2L4 13h7l-2 9 11-13h-7L13 2Z"
          stroke="#F2843C" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    1: ( // Network nodes — integration
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <circle cx="12" cy="12" r="2.5" stroke="#F2843C" strokeWidth="1.2" />
        <circle cx="4"  cy="5"  r="1.8" stroke="#F2843C" strokeWidth="1" />
        <circle cx="20" cy="5"  r="1.8" stroke="#F2843C" strokeWidth="1" />
        <circle cx="4"  cy="19" r="1.8" stroke="#F2843C" strokeWidth="1" />
        <circle cx="20" cy="19" r="1.8" stroke="#F2843C" strokeWidth="1" />
        <line x1="5.8"  y1="6.5"  x2="10.3" y2="10.8" stroke="#F2843C" strokeWidth="0.9" opacity="0.6" />
        <line x1="18.2" y1="6.5"  x2="13.7" y2="10.8" stroke="#F2843C" strokeWidth="0.9" opacity="0.6" />
        <line x1="5.8"  y1="17.5" x2="10.3" y2="13.2" stroke="#F2843C" strokeWidth="0.9" opacity="0.6" />
        <line x1="18.2" y1="17.5" x2="13.7" y2="13.2" stroke="#F2843C" strokeWidth="0.9" opacity="0.6" />
      </svg>
    ),
    2: ( // Bar chart — analytics
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <line x1="3" y1="20" x2="21" y2="20" stroke="#F2843C" strokeWidth="1.2" />
        <rect x="5"    y="13" width="3" height="7" fill="#F2843C" opacity="0.45" />
        <rect x="10.5" y="8"  width="3" height="12" fill="#F2843C" opacity="0.75" />
        <rect x="16"   y="11" width="3" height="9"  fill="#F2843C" opacity="0.55" />
      </svg>
    ),
    3: ( // Shield — security/reliability
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M12 2L4 6v5.5C4 16.3 7.6 20.7 12 22c4.4-1.3 8-5.7 8-10.5V6L12 2Z"
          stroke="#F2843C" strokeWidth="1.2" fill="none" />
        <path d="M9 12l2 2 4-4" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    4: ( // Target / precision
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <circle cx="12" cy="12" r="9"  stroke="#F2843C" strokeWidth="1.1" opacity="0.45" />
        <circle cx="12" cy="12" r="5.5" stroke="#F2843C" strokeWidth="1.1" opacity="0.65" />
        <circle cx="12" cy="12" r="2"  fill="#F2843C" opacity="0.9" />
        <line x1="12" y1="2"  x2="12" y2="5"  stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="12" y1="19" x2="12" y2="22" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="2"  y1="12" x2="5"  y2="12" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="19" y1="12" x2="22" y2="12" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
      </svg>
    ),
    5: ( // Code brackets — developer/API
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M8 6L3 12l5 6"  stroke="#F2843C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6l5 6-5 6"  stroke="#F2843C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="14" y1="4" x2="10" y2="20" stroke="#F2843C" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
    6: ( // Arrows outward — scale/expand
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M14 4h6v6"   stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20H4v-6" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="20" y1="4"  x2="13" y2="11" stroke="#F2843C" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4"  y1="20" x2="11" y2="13" stroke="#F2843C" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    7: ( // Layers / stack
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M2 8l10-5 10 5-10 5L2 8Z" stroke="#F2843C" strokeWidth="1.2" fill="none" />
        <path d="M2 12l10 5 10-5"           stroke="#F2843C" strokeWidth="1.2" opacity="0.6" />
        <path d="M2 16l10 5 10-5"           stroke="#F2843C" strokeWidth="1.2" opacity="0.35" />
      </svg>
    ),
  }

  return <>{icons[type]}</>
}

export default function FeaturesGrid({ content }: { content: FeaturesContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section className="w-full py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center gap-4 mb-10">
          <span className="font-mono text-xs text-amber uppercase tracking-widest">Features</span>
          <div className="rule-amber flex-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border">
          {content.features.map((feature, i) => (
            <motion.div
              key={i}
              className="bg-background p-8 flex flex-col gap-4 group relative"
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              {/* Amber hover rule — bottom */}
              <div className="absolute bottom-0 left-0 h-px w-0 bg-amber transition-all duration-500 group-hover:w-full" />

              {/* Icon top-right */}
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-amber/60 tabular-nums shrink-0 mt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                  <FeatureIcon index={i} />
                </div>
              </div>

              <h3 className="font-display text-base font-bold text-foreground group-hover:text-amber transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
