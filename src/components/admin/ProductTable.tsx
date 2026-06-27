"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Product, ProductStatus } from "@/types"

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  preview: "Preview",
  published: "Live",
}

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: "text-slate border-slate/30",
  preview: "text-amber border-amber/30",
  published: "text-green-400 border-green-400/30",
}

interface Props {
  initialProducts: Product[]
}

export default function ProductTable({ initialProducts }: Props) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  async function cycleStatus(product: Product) {
    const next: Record<ProductStatus, ProductStatus> = {
      draft: "preview",
      preview: "published",
      published: "draft",
    }
    const newStatus = next[product.status]
    setUpdating(product.id)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p))
      toast.success(`${product.name} set to ${STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error("Failed to update status")
    } finally {
      setUpdating(null)
    }
  }

  async function deleteProduct(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success("Product deleted")
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setDeleting(null)
      setConfirming(null)
    }
  }

  if (products.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 border border-dashed border-border rounded-lg">
        <p className="font-mono text-xs text-slate">No products yet.</p>
        <a
          href="/admin/new"
          className="font-mono text-xs text-amber hover:text-amber/80 transition-colors"
        >
          Add your first product →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Table header */}
      <div className="grid grid-cols-[2rem_1fr_6rem_8rem_auto] gap-4 items-center py-2 border-b border-border">
        <span className="font-mono text-xs text-slate">#</span>
        <span className="font-mono text-xs text-slate uppercase tracking-wider">Product</span>
        <span className="font-mono text-xs text-slate uppercase tracking-wider">Status</span>
        <span />
        <span />
      </div>

      {products.map((product, i) => (
        <div
          key={product.id}
          className="grid grid-cols-[2rem_1fr_6rem_8rem_auto] gap-4 items-center py-5 border-b border-border group"
        >
          <span className="font-mono text-xs text-slate tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>

          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-display text-sm font-bold text-foreground truncate">
              {product.name}
            </span>
            {product.tagline && (
              <span className="font-mono text-xs text-slate truncate">{product.tagline}</span>
            )}
          </div>

          <button
            onClick={() => cycleStatus(product)}
            disabled={updating === product.id}
            className={`font-mono text-xs border rounded px-2 py-1 transition-colors w-fit ${STATUS_COLORS[product.status]} hover:border-amber/50 hover:text-amber disabled:opacity-50`}
            title="Click to cycle status"
          >
            {updating === product.id ? "…" : STATUS_LABELS[product.status]}
          </button>

          <a
            href={`/admin/${product.id}`}
            className="font-mono text-xs text-slate hover:text-foreground transition-colors uppercase tracking-wider justify-self-end"
          >
            Edit →
          </a>

          <div className="flex items-center justify-end">
            {confirming === product.id ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate">Delete?</span>
                <button
                  onClick={() => deleteProduct(product.id)}
                  disabled={deleting === product.id}
                  className="font-mono text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {deleting === product.id ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="font-mono text-xs text-slate hover:text-foreground transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(product.id)}
                className="font-mono text-xs text-slate hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
