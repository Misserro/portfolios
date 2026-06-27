"use client"

import { motion } from "framer-motion"
import type { HeroContent } from "@/types"

interface Props {
  content: HeroContent
  productName?: string
}

export default function HeroBlock({ content, productName }: Props) {
  const headline = content.headline || productName || ""

  return (
    <section className="w-full pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — text */}
        <div className="flex flex-col">
          {content.tags?.length > 0 && (
            <motion.div className="flex gap-3 mb-8 flex-wrap"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              {content.tags.map(tag => (
                <span key={tag} className="font-mono text-xs text-slate border border-border px-2 py-1 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {headline && (
            <motion.h1
              className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[0.97]"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}>
              {headline}
            </motion.h1>
          )}

          {content.subheadline && (
            <motion.p className="mt-4 font-display text-2xl text-amber font-semibold"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}>
              {content.subheadline}
            </motion.p>
          )}

          <motion.div className="mt-5 rule-amber w-16"
            initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }} />

          <motion.p className="mt-6 text-base text-slate leading-relaxed max-w-lg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}>
            {content.description}
          </motion.p>
        </div>

        {/* Right — logo */}
        <motion.div
          className="w-full h-[280px] lg:h-[340px] flex items-center justify-center border border-border/40 relative"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>

          {/* Corner marks */}
          <span className="absolute top-0 left-0  w-4 h-px bg-amber/40" />
          <span className="absolute top-0 left-0  w-px h-4 bg-amber/40" />
          <span className="absolute top-0 right-0 w-4 h-px bg-amber/40" />
          <span className="absolute top-0 right-0 w-px h-4 bg-amber/40" />
          <span className="absolute bottom-0 left-0  w-4 h-px bg-amber/40" />
          <span className="absolute bottom-0 left-0  w-px h-4 bg-amber/40" />
          <span className="absolute bottom-0 right-0 w-4 h-px bg-amber/40" />
          <span className="absolute bottom-0 right-0 w-px h-4 bg-amber/40" />

          {content.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.logo_url} alt={headline} className="max-w-[70%] max-h-[60%] object-contain" />
          ) : (
            <span className="font-mono text-[10px] text-slate/30 uppercase tracking-widest select-none">logo</span>
          )}
        </motion.div>
      </div>
    </section>
  )
}
