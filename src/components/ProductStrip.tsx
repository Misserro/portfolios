"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import Link from "next/link"
import type { Product } from "@/types"

interface Props {
  product: Product
  index: number
}

// Four abstract SVG visualizations — cycle by product index
function ProductViz({ index }: { index: number }) {
  const type = index % 4

  if (type === 0) return (
    // Waveform / signal trace
    <svg viewBox="0 0 220 120" fill="none" className="product-viz w-full h-full">
      <line x1="0" y1="40" x2="220" y2="40" stroke="#D4A853" strokeWidth="0.4" opacity="0.3"/>
      <line x1="0" y1="80" x2="220" y2="80" stroke="#D4A853" strokeWidth="0.4" opacity="0.3"/>
      <line x1="55" y1="4" x2="55" y2="116" stroke="#D4A853" strokeWidth="0.4" opacity="0.2"/>
      <line x1="110" y1="4" x2="110" y2="116" stroke="#D4A853" strokeWidth="0.4" opacity="0.2"/>
      <line x1="165" y1="4" x2="165" y2="116" stroke="#D4A853" strokeWidth="0.4" opacity="0.2"/>
      <polyline
        points="0,88 20,52 40,94 60,28 80,72 100,16 120,58 140,38 160,74 180,30 200,50 220,62"
        stroke="#D4A853" strokeWidth="1.5" opacity="0.9"
      />
      <circle cx="100" cy="16" r="3.5" fill="#D4A853" opacity="1"/>
      <circle cx="60" cy="28" r="2" fill="#D4A853" opacity="0.6"/>
      <circle cx="180" cy="30" r="2" fill="#D4A853" opacity="0.6"/>
    </svg>
  )

  if (type === 1) return (
    // Architecture diagram — right-angle system blocks
    <svg viewBox="0 0 220 120" fill="none" className="product-viz w-full h-full">
      <rect x="88" y="46" width="44" height="28" stroke="#D4A853" strokeWidth="1" opacity="0.9"/>
      <rect x="16" y="16" width="34" height="20" stroke="#D4A853" strokeWidth="0.7" opacity="0.5"/>
      <rect x="16" y="84" width="34" height="20" stroke="#D4A853" strokeWidth="0.7" opacity="0.5"/>
      <rect x="170" y="16" width="34" height="20" stroke="#D4A853" strokeWidth="0.7" opacity="0.5"/>
      <rect x="170" y="84" width="34" height="20" stroke="#D4A853" strokeWidth="0.7" opacity="0.5"/>
      <line x1="50" y1="26" x2="88" y2="53" stroke="#D4A853" strokeWidth="0.6" opacity="0.35"/>
      <line x1="50" y1="94" x2="88" y2="67" stroke="#D4A853" strokeWidth="0.6" opacity="0.35"/>
      <line x1="132" y1="53" x2="170" y2="26" stroke="#D4A853" strokeWidth="0.6" opacity="0.35"/>
      <line x1="132" y1="67" x2="170" y2="94" stroke="#D4A853" strokeWidth="0.6" opacity="0.35"/>
      <circle cx="110" cy="60" r="3" fill="#D4A853" opacity="0.8"/>
    </svg>
  )

  if (type === 2) return (
    // Constellation / data scatter
    <svg viewBox="0 0 220 120" fill="none" className="product-viz w-full h-full">
      {([
        [38, 28, 3.5], [78, 62, 2.5], [128, 22, 4.5], [162, 68, 2.5],
        [52, 88, 2], [104, 48, 5.5], [178, 32, 2.5], [192, 88, 1.8],
        [22, 58, 1.8], [152, 98, 1.8], [72, 12, 2], [138, 78, 1.8],
      ] as [number, number, number][]).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#D4A853" opacity={0.25 + r * 0.08}/>
      ))}
      <line x1="38" y1="28" x2="78" y2="62" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <line x1="78" y1="62" x2="104" y2="48" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <line x1="104" y1="48" x2="128" y2="22" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <line x1="128" y1="22" x2="162" y2="68" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <line x1="78" y1="62" x2="52" y2="88" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <line x1="104" y1="48" x2="162" y2="68" stroke="#D4A853" strokeWidth="0.5" opacity="0.22"/>
      <circle cx="104" cy="48" r="11" stroke="#D4A853" strokeWidth="0.5" opacity="0.12"/>
      <circle cx="104" cy="48" r="18" stroke="#D4A853" strokeWidth="0.3" opacity="0.07"/>
    </svg>
  )

  // type === 3: Vertical bar chart / metrics
  return (
    <svg viewBox="0 0 220 120" fill="none" className="product-viz w-full h-full">
      <line x1="18" y1="102" x2="202" y2="102" stroke="#D4A853" strokeWidth="0.5" opacity="0.3"/>
      {[42, 64, 38, 78, 55, 88, 48, 70, 60, 92].map((h, i) => (
        <rect
          key={i}
          x={18 + i * 18}
          y={102 - h * 0.86}
          width="13"
          height={h * 0.86}
          rx="1"
          fill="#D4A853"
          opacity={i === 5 ? 0.75 : 0.12 + (h / 100) * 0.28}
        />
      ))}
      <line x1="18" y1="78" x2="202" y2="78" stroke="#D4A853" strokeWidth="0.4" strokeDasharray="3 4" opacity="0.2"/>
    </svg>
  )
}

export default function ProductStrip({ product, index }: Props) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/${product.slug}`} className="block group product-entry">
        <div className="relative border-b border-border py-10 flex items-stretch gap-10 overflow-hidden">

          {/* Amber bottom rule — expands on hover */}
          <div className="absolute bottom-0 left-0 h-px w-0 bg-amber transition-all duration-500 ease-out group-hover:w-full" />

          {/* Content — left */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-6">
            <div className="flex items-baseline gap-5">
              <span className="font-mono text-xs text-slate/50 tabular-nums shrink-0 select-none">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-3xl font-bold text-foreground group-hover:text-amber transition-colors duration-300 leading-tight">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm text-slate leading-relaxed max-w-md">
                  {product.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pl-10">
              <div className="flex gap-2 flex-wrap">
                {(product.segments ?? [])
                  .filter(s => s.visible)
                  .slice(0, 3)
                  .map(s => (
                    <span key={s.type} className="font-mono text-[10px] text-slate/50 border border-border/60 px-2 py-0.5 uppercase tracking-wider">
                      {s.type.replace(/_/g, " ")}
                    </span>
                  ))}
              </div>
              <span className="font-mono text-xs text-slate group-hover:text-amber transition-colors duration-300 tracking-wider uppercase flex items-center gap-2">
                View
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </div>
          </div>

          {/* Visualization — right */}
          <div className="shrink-0 w-[200px] h-[130px] hidden sm:flex items-center justify-center self-center">
            <div className="w-full h-full relative overflow-hidden border border-border/40 group-hover:border-amber/20 transition-colors duration-500">
              {/* Subtle corner marks */}
              <span className="absolute top-0 left-0 w-2 h-px bg-amber/40" />
              <span className="absolute top-0 left-0 w-px h-2 bg-amber/40" />
              <span className="absolute bottom-0 right-0 w-2 h-px bg-amber/40" />
              <span className="absolute bottom-0 right-0 w-px h-2 bg-amber/40" />
              <ProductViz index={index} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
