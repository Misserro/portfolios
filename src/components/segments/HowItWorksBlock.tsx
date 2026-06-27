"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { HowItWorksContent } from "@/types"

export default function HowItWorksBlock({ content }: { content: HowItWorksContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section className="px-8 py-20 max-w-5xl" ref={ref}>
      <div className="flex items-center gap-4 mb-12">
        <span className="font-mono text-xs text-amber uppercase tracking-widest">How it works</span>
        <div className="rule-amber flex-1" />
      </div>
      <div className="flex flex-col gap-0">
        {content.steps.map((step, i) => (
          <motion.div
            key={i}
            className="flex gap-8 pb-10 last:pb-0"
            initial={{ opacity: 0, x: -8 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="flex flex-col items-center gap-0 shrink-0 pt-1">
              <span className="font-mono text-xs text-amber tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {i < content.steps.length - 1 && (
                <div className="w-px flex-1 bg-border mt-3 min-h-8" />
              )}
            </div>
            <div className="flex flex-col gap-2 pb-10 last:pb-0">
              <h3 className="font-display text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-slate leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
