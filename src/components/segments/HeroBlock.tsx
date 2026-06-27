"use client"

import { motion } from "framer-motion"
import type { HeroContent } from "@/types"

export default function HeroBlock({ content }: { content: HeroContent }) {
  return (
    <section className="relative flex flex-col items-center text-center px-6 pt-32 pb-20">
      <motion.p
        className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {content.tags?.join(" · ")}
      </motion.p>
      <motion.h1
        className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05] max-w-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {content.headline}
      </motion.h1>
      {content.subheadline && (
        <motion.p
          className="mt-4 font-display text-xl text-cyan font-medium"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {content.subheadline}
        </motion.p>
      )}
      <motion.p
        className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {content.description}
      </motion.p>
    </section>
  )
}
