"use client"

import { motion } from "framer-motion"
import type { HowItWorksContent } from "@/types"

export default function HowItWorksBlock({ content }: { content: HowItWorksContent }) {
  return (
    <section className="px-8 py-24 max-w-4xl mx-auto w-full">
      <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-12 text-center">
        How it works
      </p>
      <div className="flex flex-col gap-0">
        {content.steps.map((step, i) => (
          <motion.div
            key={i}
            className="flex gap-8 pb-12 last:pb-0"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full border border-cyan/30 flex items-center justify-center">
                <span className="font-mono text-xs text-cyan">{i + 1}</span>
              </div>
              {i < content.steps.length - 1 && (
                <div className="w-px flex-1 bg-gradient-to-b from-cyan/20 to-transparent min-h-8" />
              )}
            </div>
            <div className="flex flex-col gap-2 pt-1 pb-12 last:pb-0">
              <h3 className="font-display text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
