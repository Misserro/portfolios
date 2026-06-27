"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { FeaturesContent } from "@/types"

// Pick icon semantically from feature content — order = priority
function iconIndex(title: string, description: string): number {
  const t = `${title} ${description}`.toLowerCase()
  if (/secur|protect|safe|complian|privacy|encrypt|auth|permiss/i.test(t))       return 3 // shield
  if (/\bai\b|ml\b|model|predict|learn|intelligen|automat|generat/i.test(t))     return 8 // neural/brain
  if (/fast|speed|perform|quick|rapid|instant|real.?time|latency/i.test(t))      return 0 // lightning
  if (/analyt|report|metric|insight|dashboard|track|kpi|monitor/i.test(t))       return 2 // chart
  if (/accur|precis|target|detect|alert|notif|exact|match/i.test(t))             return 4 // target
  if (/\bapi\b|sdk|dev|code|webhook|integrat|custom|extend|embed/i.test(t))      return 5 // code brackets
  if (/scale|grow|expand|enterprise|volume|global|elastic|capacity/i.test(t))    return 6 // arrows out
  if (/infra|deploy|cloud|platform|layer|stack|architect|host/i.test(t))         return 7 // layers
  if (/connect|sync|pipeline|link|import|export|transfer|unif/i.test(t))         return 1 // network
  // Deterministic fallback: hash title so the same feature always maps the same
  return title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 9
}

function FeatureIcon({ title, description }: { title: string; description: string }) {
  const idx = iconIndex(title, description)

  const icons: Record<number, React.ReactNode> = {
    0: ( // Lightning — speed/performance
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M13 2L4 13h7l-2 9 11-13h-7L13 2Z"
          stroke="#F2843C" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
    1: ( // Network — integration/connectivity
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
    2: ( // Bar chart — analytics/metrics
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <line x1="3" y1="20" x2="21" y2="20" stroke="#F2843C" strokeWidth="1.2" />
        <rect x="5"    y="13" width="3" height="7"  fill="#F2843C" opacity="0.45" />
        <rect x="10.5" y="8"  width="3" height="12" fill="#F2843C" opacity="0.75" />
        <rect x="16"   y="11" width="3" height="9"  fill="#F2843C" opacity="0.55" />
      </svg>
    ),
    3: ( // Shield — security/compliance
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M12 2L4 6v5.5C4 16.3 7.6 20.7 12 22c4.4-1.3 8-5.7 8-10.5V6L12 2Z"
          stroke="#F2843C" strokeWidth="1.2" />
        <path d="M9 12l2 2 4-4" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    4: ( // Target — precision/detection
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <circle cx="12" cy="12" r="9"   stroke="#F2843C" strokeWidth="1"   opacity="0.4" />
        <circle cx="12" cy="12" r="5.5" stroke="#F2843C" strokeWidth="1.1" opacity="0.65" />
        <circle cx="12" cy="12" r="2"   fill="#F2843C"   opacity="0.9" />
        <line x1="12" y1="2"  x2="12" y2="5"  stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="12" y1="19" x2="12" y2="22" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="2"  y1="12" x2="5"  y2="12" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
        <line x1="19" y1="12" x2="22" y2="12" stroke="#F2843C" strokeWidth="1" opacity="0.4" />
      </svg>
    ),
    5: ( // Code brackets — API/developer
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M8 6L3 12l5 6"  stroke="#F2843C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6l5 6-5 6"  stroke="#F2843C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="14" y1="4" x2="10" y2="20" stroke="#F2843C" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
    6: ( // Arrows out — scale/expansion
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M14 4h6v6"   stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20H4v-6" stroke="#F2843C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="20" y1="4"  x2="13" y2="11" stroke="#F2843C" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4"  y1="20" x2="11" y2="13" stroke="#F2843C" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    7: ( // Layers — infrastructure/platform
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <path d="M2 8l10-5 10 5-10 5L2 8Z"   stroke="#F2843C" strokeWidth="1.2" />
        <path d="M2 12l10 5 10-5"             stroke="#F2843C" strokeWidth="1.2" opacity="0.6" />
        <path d="M2 16l10 5 10-5"             stroke="#F2843C" strokeWidth="1.2" opacity="0.35" />
      </svg>
    ),
    8: ( // Neural node — AI/ML/automation
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
        <circle cx="12" cy="12" r="3"  fill="#F2843C" opacity="0.8" />
        <circle cx="4"  cy="7"  r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" />
        <circle cx="4"  cy="17" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" />
        <circle cx="20" cy="12" r="1.8" stroke="#F2843C" strokeWidth="1" opacity="0.6" />
        <line x1="5.5"  y1="7.5"  x2="9.5"  y2="11"   stroke="#F2843C" strokeWidth="0.9" opacity="0.4" />
        <line x1="5.5"  y1="16.5" x2="9.5"  y2="13"   stroke="#F2843C" strokeWidth="0.9" opacity="0.4" />
        <line x1="14.5" y1="12"   x2="18.2" y2="12"   stroke="#F2843C" strokeWidth="0.9" opacity="0.4" />
      </svg>
    ),
  }

  return <>{icons[idx] ?? icons[0]}</>
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
              <div className="absolute bottom-0 left-0 h-px w-0 bg-amber transition-all duration-500 group-hover:w-full" />

              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs text-amber/50 tabular-nums shrink-0 mt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-300 w-7 h-7">
                  {feature.icon_svg ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7"
                      // Safe: generated by our own Claude API call, sanitized before storage
                      dangerouslySetInnerHTML={{ __html: feature.icon_svg }} />
                  ) : (
                    <FeatureIcon title={feature.title} description={feature.description} />
                  )}
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
