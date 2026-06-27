"use client"

import { useRef } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import Link from "next/link"
import type { Product } from "@/types"

interface Props {
  product: Product
  index: number
}

export default function ProductCard({ product, index }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const scanY = useMotionValue(-100)
  const scanOpacity = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-4, 4])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
    scanY.set(e.clientY - rect.top)
    scanOpacity.set(1)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
    scanOpacity.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      style={{ perspective: 1000 }}
    >
      <Link href={`/${product.slug}`}>
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden glass rounded-2xl p-8 cursor-pointer group"
        >
          {/* Scan line — the signature element */}
          <motion.div
            className="pointer-events-none absolute left-0 right-0 h-px"
            style={{
              top: scanY,
              opacity: scanOpacity,
              background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)",
            }}
          />

          {/* Glow on hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 glow-cyan pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 flex flex-col gap-6 min-h-52">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-cyan/60" />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <h2 className="font-display text-xl font-semibold text-white group-hover:text-cyan transition-colors duration-300">
                {product.name}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.tagline}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-cyan/60 tracking-wider">
                VIEW PROJECT →
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
