"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { TestimonialsContent } from "@/types"

export default function TestimonialsBlock({ content }: { content: TestimonialsContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section className="px-8 py-20 max-w-5xl" ref={ref}>
      <div className="flex items-center gap-4 mb-12">
        <span className="font-mono text-xs text-amber uppercase tracking-widest">What clients say</span>
        <div className="rule-amber flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {content.testimonials.map((t, i) => (
          <motion.div
            key={i}
            className="bg-background p-8 flex flex-col gap-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            {/* Opening mark — amber rule instead of a quote character */}
            <div className="rule-amber w-6" />
            <p className="text-sm text-foreground leading-relaxed">
              {t.quote}
            </p>
            <div className="flex flex-col gap-0.5 mt-auto">
              <span className="font-display text-sm font-bold text-foreground">{t.author}</span>
              <span className="font-mono text-xs text-slate">
                {t.role}{t.company ? `, ${t.company}` : ""}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
