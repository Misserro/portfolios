"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { CTAContent } from "@/types"

export default function CTABlock({ content }: { content: CTAContent }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section className="w-full py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          className="surface-elevated p-12 glow-amber relative overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Corner marks */}
          <span className="absolute top-0 left-0  w-8 h-px bg-amber/60" />
          <span className="absolute top-0 left-0  w-px h-8 bg-amber/60" />
          <span className="absolute bottom-0 right-0 w-8 h-px bg-amber/60" />
          <span className="absolute bottom-0 right-0 w-px h-8 bg-amber/60" />

          <div className="rule-amber w-12 mb-6" />
          <h2 className="font-display text-3xl font-extrabold text-foreground mb-4 leading-tight">
            {content.headline}
          </h2>
          <p className="text-slate mb-8 leading-relaxed max-w-lg">
            {content.description}
          </p>
          <a
            href={content.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-amber text-background font-display font-bold px-8 py-3 hover:bg-amber/90 transition-colors text-sm"
          >
            {content.button_label}
          </a>
        </motion.div>
      </div>
    </section>
  )
}
