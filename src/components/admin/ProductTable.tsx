"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Product, ProductStatus } from "@/types"

const STATUS_CYCLE: Record<ProductStatus, ProductStatus> = {
  draft: "preview",
  preview: "published",
  published: "draft",
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "draft",
  preview: "preview",
  published: "live",
}

const STATUS_COLOR: Record<ProductStatus, string> = {
  draft:     "text-slate     border-slate/20",
  preview:   "text-amber     border-amber/30",
  published: "text-green-400 border-green-400/25",
}

export default function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [cycling, setCycling]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirm, setConfirm]   = useState<string | null>(null)

  async function cycleStatus(product: Product) {
    const next = STATUS_CYCLE[product.status]
    setCycling(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: next } : p))
      toast.success(`${product.name} — ${STATUS_LABEL[next]}`)
    } catch {
      toast.error("Status update failed")
    } finally {
      setCycling(null)
    }
  }

  async function deleteProduct(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success("Product removed")
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border rounded py-20 flex flex-col items-center gap-3">
        <span className="font-mono text-xs text-slate">No products.</span>
        <a href="/admin/new" className="font-mono text-xs text-amber hover:opacity-70 transition-opacity">
          Add the first one →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-x-6 items-center pb-3 border-b border-border">
        {["#", "Product", "Status", "", ""].map((h, i) => (
          <span key={i} className="font-mono text-xs text-slate uppercase tracking-widest">{h}</span>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-x-6 items-center py-5 border-b border-border group"
          >
            {/* Index */}
            <span className="font-mono text-xs text-slate tabular-nums select-none">
              {String(i + 1).padStart(2, "0")}
            </span>

            {/* Name + tagline */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-display text-sm font-bold text-foreground truncate leading-snug">
                {product.name}
              </span>
              {product.tagline && (
                <span className="font-mono text-xs text-slate truncate">{product.tagline}</span>
              )}
            </div>

            {/* Status badge — clickable to cycle */}
            <button
              onClick={() => cycleStatus(product)}
              disabled={cycling === product.id}
              title="Click to change status"
              className={`font-mono text-xs border rounded-sm px-2 py-1 w-fit transition-all hover:border-amber/40 hover:text-amber disabled:opacity-40 ${STATUS_COLOR[product.status]}`}
            >
              {cycling === product.id ? "·" : STATUS_LABEL[product.status]}
            </button>

            {/* Edit link */}
            <a
              href={`/admin/${product.id}`}
              className="font-mono text-xs text-slate hover:text-foreground transition-colors"
            >
              edit →
            </a>

            {/* Delete */}
            <div className="flex items-center justify-end">
              <AnimatePresence mode="wait">
                {confirm === product.id ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => deleteProduct(product.id)}
                      disabled={deleting === product.id}
                      className="font-mono text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                      {deleting === product.id ? "·" : "yes"}
                    </button>
                    <span className="font-mono text-xs text-border">/</span>
                    <button
                      onClick={() => setConfirm(null)}
                      className="font-mono text-xs text-slate hover:text-foreground transition-colors"
                    >
                      no
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="delete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setConfirm(product.id)}
                    className="font-mono text-xs text-slate/0 group-hover:text-slate hover:text-red-400 transition-colors"
                  >
                    ×
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
