"use client"

import { motion } from "framer-motion"
import type { StatsContent } from "@/types"

export default function StatsBlock({ content }: { content: StatsContent }) {
  return (
    <section className="px-8 py-24 max-w-7xl mx-auto w-full">
      <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-12 text-center">
        By the numbers
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {content.stats.map((stat, i) => (
          <motion.div
            key={i}
            className="glass-elevated rounded-xl p-6 flex flex-col gap-2 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <span className="font-mono text-3xl font-medium text-green tracking-tight">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            {stat.note && (
              <span className="text-xs text-muted-foreground/60">{stat.note}</span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
