"use client"

import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion"
import { useRef, useEffect } from "react"
import type { StatsContent } from "@/types"

function StatItem({ stat, index }: { stat: { label: string; value: string; note?: string }; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const barWidth = useMotionValue(0)
  const springWidth = useSpring(barWidth, { stiffness: 80, damping: 20 })

  useEffect(() => {
    if (isInView) {
      // Slight delay per item, then animate bar to ~70-90% (represents "strong but not full")
      setTimeout(() => {
        animate(barWidth, 72 + (index % 3) * 8, { duration: 1.2, ease: "easeOut" })
      }, index * 120)
    }
  }, [isInView, index, barWidth])

  return (
    <motion.div
      ref={ref}
      className="flex flex-col gap-3 py-6 border-b border-border last:border-0"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <span className="font-mono text-xs text-slate uppercase tracking-widest">
        {stat.label}
      </span>
      <span className="font-display text-4xl font-bold text-foreground tracking-tight">
        {stat.value}
      </span>
      {stat.note && (
        <span className="font-mono text-xs text-slate">{stat.note}</span>
      )}
      {/* Gauge bar — the signature element */}
      <div className="h-px bg-border w-full mt-1">
        <motion.div
          className="h-px bg-amber origin-left"
          style={{ width: springWidth.get() + "%" }}
        >
          <motion.div className="h-px bg-amber" style={{ scaleX: springWidth, transformOrigin: "left" }} />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function StatsBlock({ content }: { content: StatsContent }) {
  return (
    <section className="px-8 py-20 max-w-5xl">
      <div className="flex items-center gap-4 mb-10">
        <span className="font-mono text-xs text-amber uppercase tracking-widest">By the numbers</span>
        <div className="rule-amber flex-1" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border">
        {content.stats.map((stat, i) => (
          <div key={i} className="px-6 first:pl-0">
            <StatItem stat={stat} index={i} />
          </div>
        ))}
      </div>
    </section>
  )
}
