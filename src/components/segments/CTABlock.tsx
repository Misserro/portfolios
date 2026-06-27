"use client"

import { motion } from "framer-motion"
import type { CTAContent } from "@/types"

export default function CTABlock({ content }: { content: CTAContent }) {
  return (
    <section className="px-8 py-24 max-w-3xl mx-auto w-full text-center">
      <motion.div
        className="glass-elevated rounded-2xl p-12 glow-cyan"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl font-bold text-white mb-4">
          {content.headline}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {content.description}
        </p>
        <a
          href={content.button_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-cyan text-background font-display font-semibold px-8 py-3 rounded-lg hover:bg-cyan/90 transition-colors"
        >
          {content.button_label}
        </a>
      </motion.div>
    </section>
  )
}
