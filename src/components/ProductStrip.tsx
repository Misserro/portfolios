"use client"

import { useRef } from "react"
import { motion, useMotionValue, useSpring, animate } from "framer-motion"
import Link from "next/link"
import type { Product } from "@/types"

interface Props {
  product: Product
  index: number
}

export default function ProductStrip({ product, index }: Props) {
  const ruleWidth = useMotionValue(0)
  const springWidth = useSpring(ruleWidth, { stiffness: 200, damping: 28 })

  function handleEnter() {
    animate(ruleWidth, 100, { duration: 0.4, ease: "easeOut" })
  }

  function handleLeave() {
    animate(ruleWidth, 0, { duration: 0.3, ease: "easeIn" })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link href={`/${product.slug}`}>
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className="group relative border-b border-border py-8 px-0 cursor-pointer"
        >
          {/* Amber sweep rule */}
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-amber"
            style={{ width: springWidth.get() === 0 ? "0%" : `${springWidth.get()}%` }}
          >
            <motion.div
              className="absolute bottom-0 left-0 h-px"
              style={{
                width: springWidth,
                background: "var(--amber)",
                scaleX: springWidth,
              }}
            />
          </motion.div>
          <motion.div
            className="absolute bottom-0 left-0 h-px origin-left"
            style={{
              scaleX: useSpring(useMotionValue(0), { stiffness: 200, damping: 28 }),
              background: "var(--amber)",
            }}
          />

          <div className="flex items-center justify-between gap-8">
            {/* Index + Name */}
            <div className="flex items-baseline gap-6 min-w-0">
              <span className="font-mono text-xs text-slate shrink-0 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="font-display text-2xl font-bold text-foreground group-hover:text-amber transition-colors duration-300 truncate">
                  {product.name}
                </h2>
                <p className="text-sm text-slate leading-snug line-clamp-1">
                  {product.tagline}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex items-center gap-3">
              <span className="font-mono text-xs text-slate group-hover:text-amber transition-colors duration-300 tracking-wider uppercase hidden sm:block">
                View project
              </span>
              <motion.span
                className="font-mono text-amber text-lg"
                animate={{ x: 0 }}
                whileHover={{ x: 4 }}
              >
                →
              </motion.span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
