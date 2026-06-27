"use client"

import { motion } from "framer-motion"
import type { HeroContent } from "@/types"

export default function HeroBlock({ content }: { content: HeroContent }) {
  return (
    <section className="px-8 pt-24 pb-16 max-w-5xl">
      {content.tags?.length > 0 && (
        <motion.div
          className="flex gap-3 mb-8 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {content.tags.map(tag => (
            <span key={tag} className="font-mono text-xs text-slate border border-border rounded px-2 py-1 uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </motion.div>
      )}
      <motion.h1
        className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground leading-[0.97] max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {content.headline}
      </motion.h1>
      {content.subheadline && (
        <motion.p
          className="mt-4 font-display text-2xl text-amber font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          {content.subheadline}
        </motion.p>
      )}
      <motion.div
        className="mt-4 rule-amber w-16"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <motion.p
        className="mt-6 text-base text-slate max-w-xl leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {content.description}
      </motion.p>
    </section>
  )
}
