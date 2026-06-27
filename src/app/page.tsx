"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Header from "@/components/layout/Header"
import AdminLoginModal from "@/components/layout/AdminLoginModal"
import ProductStrip from "@/components/ProductStrip"
import type { Product } from "@/types"

export default function HomePage() {
  const [adminOpen, setAdminOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

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

      {/* Hero */}
      <section className="relative z-10 px-8 pt-32 pb-20 max-w-5xl">
        <motion.p
          className="font-mono text-xs tracking-[0.25em] text-amber uppercase mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          sfer.co — built work
        </motion.p>
        <motion.h1
          className="font-display text-6xl sm:text-8xl font-extrabold tracking-tight text-foreground leading-[0.95]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Software
          <br />
          <span className="text-amber">that ships.</span>
        </motion.h1>
        <motion.p
          className="mt-8 text-base text-slate max-w-md leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Each product below is presented in full — how it works, what it does,
          and what it has achieved.
        </motion.p>
      </section>

      {/* Product list */}
      <section className="relative z-10 px-8 pb-32 max-w-5xl">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-0">
          <span className="font-mono text-xs text-slate uppercase tracking-widest">Product</span>
          <span className="font-mono text-xs text-slate uppercase tracking-widest hidden sm:block">Details</span>
        </div>

        {products.length > 0 ? (
          products.map((product, i) => (
            <ProductStrip key={product.id} product={product} index={i} />
          ))
        ) : (
          <div className="py-24 flex flex-col gap-3">
            <span className="font-mono text-xs text-slate">No products published yet.</span>
          </div>
        )}
      </section>
    </main>
  )
}
