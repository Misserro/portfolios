"use client"

import { motion } from "framer-motion"
import type { FeaturesContent } from "@/types"

export default function FeaturesGrid({ content }: { content: FeaturesContent }) {
  return (
    <section className="px-8 py-24 max-w-7xl mx-auto w-full">
      <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-12 text-center">
        Features
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.features.map((feature, i) => (
          <motion.div
            key={i}
            className="glass rounded-xl p-6 flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <h3 className="font-display text-base font-semibold text-white">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
