"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import Header from "@/components/layout/Header"
import AdminLoginModal from "@/components/layout/AdminLoginModal"
import ProductStrip from "@/components/ProductStrip"
import type { Product } from "@/types"

export default function HomePage() {
  const [adminOpen, setAdminOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const headRef = useRef(null)
  const headInView = useInView(headRef, { once: true })

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {})
  }, [])

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 dot-grid" />

      <Header onAdminTrigger={() => setAdminOpen(true)} />
      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Ambient bloom — the signature element */}
        <div className="hero-bloom" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-32 pb-28">
          {/* Eyebrow */}
          <motion.p
            className="font-mono text-xs tracking-[0.28em] text-amber/70 uppercase mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            // sfer.co — built work
          </motion.p>

          {/* Headline — clip-path line reveal */}
          <h1
            ref={headRef}
            className="font-display font-extrabold tracking-tight leading-[0.92] text-[clamp(3.5rem,8vw,7rem)]"
          >
            <span className="overflow-hidden block">
              <motion.span
                className="block text-foreground"
                initial={{ y: "105%" }}
                animate={headInView ? { y: 0 } : {}}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              >
                Software
              </motion.span>
            </span>
            <span className="overflow-hidden block">
              <motion.span
                className="block grad-text"
                initial={{ y: "105%" }}
                animate={headInView ? { y: 0 } : {}}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}
              >
                that ships.
              </motion.span>
            </span>
          </h1>

          {/* Subtitle */}
          <motion.p
            className="mt-10 text-base text-slate max-w-lg leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            Each product below is presented in full — how it works,
            what it does, and what it has achieved.
          </motion.p>

          {/* Divider rule */}
          <motion.div
            className="mt-12 rule-amber w-16"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            style={{ originX: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          />
        </div>
      </section>

      {/* ── Product list ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="flex items-center gap-4 mb-0 pb-4 border-b border-border">
          <span className="font-mono text-xs text-amber/60 uppercase tracking-widest">// products</span>
          <div className="flex-1 h-px bg-border" />
          {products.length > 0 && (
            <span className="font-mono text-xs text-slate/40 tabular-nums">
              {String(products.length).padStart(2, "0")}
            </span>
          )}
        </div>

        {products.length > 0 ? (
          products.map((product, i) => (
            <ProductStrip key={product.id} product={product} index={i} />
          ))
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  )
}

function EmptyState() {
  return (
    <motion.div
      className="py-32 flex flex-col items-start gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div className="rule-amber w-8" />
      <p className="font-mono text-xs text-slate/50">No products published yet.</p>
    </motion.div>
  )
}
