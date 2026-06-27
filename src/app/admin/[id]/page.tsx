"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion } from "framer-motion"
import type { Product, Segment, ProductStatus } from "@/types"

const STATUS_CYCLE: Record<ProductStatus, ProductStatus> = {
  draft: "preview",
  preview: "published",
  published: "draft",
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  preview: "Preview",
  published: "Live",
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        setProduct(data)
        setSegments(data.segments ?? [])
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false))
  }, [id])

  async function saveProduct() {
    if (!product) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
        }),
      })
      if (!res.ok) throw new Error()

      await fetch(`/api/products/${id}/segments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments }),
      })

      toast.success("Saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function cycleStatus() {
    if (!product) return
    const next = STATUS_CYCLE[product.status]
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      setProduct(p => p ? { ...p, status: next } : p)
      toast.success(`Status: ${STATUS_LABELS[next]}`)
    } catch {
      toast.error("Failed to update status")
    }
  }

  function toggleSegment(segmentId: string) {
    setSegments(prev =>
      prev.map(s => s.id === segmentId ? { ...s, visible: !s.visible } : s)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-amber animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-xs text-slate">Product not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="font-mono text-xs text-slate hover:text-foreground transition-colors mb-3 block"
          >
            ← Dashboard
          </button>
          <p className="font-mono text-xs text-amber uppercase tracking-widest mb-1">Edit product</p>
          <h1 className="font-display text-3xl font-bold text-foreground">{product.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cycleStatus}
            className="font-mono text-xs border border-border text-slate rounded px-4 py-2 hover:border-amber/30 hover:text-amber transition-colors"
          >
            Status: {STATUS_LABELS[product.status]} →
          </button>
          <button
            onClick={saveProduct}
            disabled={saving}
            className="bg-amber text-background font-display font-bold text-sm px-5 py-2.5 rounded hover:bg-amber/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="rule-amber w-full" />

      {/* Metadata */}
      <div className="flex flex-col gap-5">
        <p className="font-mono text-xs text-amber uppercase tracking-widest">Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-slate">Name</label>
            <input
              type="text"
              value={product.name}
              onChange={e => setProduct(p => p ? { ...p, name: e.target.value } : p)}
              className="bg-input border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-slate">Slug</label>
            <input
              type="text"
              value={product.slug}
              onChange={e => setProduct(p => p ? { ...p, slug: e.target.value } : p)}
              className="bg-input border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:border-amber/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="font-mono text-xs text-slate">Tagline</label>
            <input
              type="text"
              value={product.tagline}
              onChange={e => setProduct(p => p ? { ...p, tagline: e.target.value } : p)}
              className="bg-input border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber/40 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Segments */}
      {segments.length > 0 && (
        <div className="flex flex-col gap-5">
          <p className="font-mono text-xs text-amber uppercase tracking-widest">Segments</p>
          <p className="font-mono text-xs text-slate -mt-2">
            Toggle visibility. Hero and Preview are always shown.
          </p>
          <div className="flex flex-col gap-0">
            {segments.map((segment, i) => {
              const locked = segment.type === "hero" || segment.type === "preview"
              return (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-4 border-b border-border group"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-slate tabular-nums w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs text-foreground uppercase tracking-wider">
                      {segment.type.replace(/_/g, " ")}
                    </span>
                    {locked && (
                      <span className="font-mono text-xs text-slate/50">always on</span>
                    )}
                  </div>
                  <button
                    onClick={() => !locked && toggleSegment(segment.id)}
                    disabled={locked}
                    className={`w-8 h-4 rounded-full transition-colors ${
                      segment.visible ? "bg-amber" : "bg-elevated border border-border"
                    } ${locked ? "opacity-30 cursor-default" : "cursor-pointer"}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-background mx-0.5 transition-transform ${
                      segment.visible ? "translate-x-3.5" : "translate-x-0"
                    }`} />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {segments.length === 0 && (
        <div className="py-12 flex flex-col gap-3 border border-dashed border-border rounded-lg items-center">
          <p className="font-mono text-xs text-slate">No segments yet.</p>
          <p className="font-mono text-xs text-slate/60">Use the AI builder to generate content.</p>
        </div>
      )}
    </div>
  )
}
