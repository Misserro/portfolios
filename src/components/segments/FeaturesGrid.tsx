"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { FeaturesContent } from "@/types"

export default function FeaturesGrid({ content }: { content: FeaturesContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section className="px-8 py-20 max-w-5xl" ref={ref}>
      <div className="flex items-center gap-4 mb-10">
        <span className="font-mono text-xs text-amber uppercase tracking-widest">Features</span>
        <div className="rule-amber flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {content.features.map((feature, i) => (
          <motion.div
            key={i}
            className="bg-background p-8 flex flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <h3 className="font-display text-base font-bold text-foreground">
              {feature.title}
            </h3>
            <p className="text-sm text-slate leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
