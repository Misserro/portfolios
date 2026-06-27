"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Header from "@/components/layout/Header"
import AdminLoginModal from "@/components/layout/AdminLoginModal"
import ProductCard from "@/components/ProductCard"
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
      <div className="pointer-events-none fixed inset-0 grid-background opacity-60" />

      <Header onAdminTrigger={() => setAdminOpen(true)} />
      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24">
        <motion.p
          className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          sfer.co — product showcase
        </motion.p>
        <motion.h1
          className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05] max-w-4xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Products built to{" "}
          <span className="text-cyan">last</span>
        </motion.h1>
        <motion.p
          className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          A curated view of what we build — each project presented in full depth.
        </motion.p>
      </section>

      {/* Product grid */}
      <section className="relative z-10 px-8 pb-32 max-w-7xl mx-auto w-full">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border border-cyan/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan/40 animate-pulse" />
            </div>
            <p className="font-mono text-xs text-muted-foreground tracking-wider">
              No products published yet
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
