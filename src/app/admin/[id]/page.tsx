"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Product, Segment, ProductStatus } from "@/types"

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

const LOCKED = new Set(["hero", "preview"])

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const router   = useRouter()
  const [product, setProduct]   = useState<Product | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [saving, setSaving]     = useState(false)
  const [cycling, setCycling]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(data => { setProduct(data); setSegments(data.segments ?? []) })
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!product) return
    setSaving(true)
    try {
      const [metaRes, segRes] = await Promise.all([
        fetch(`/api/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: product.name, slug: product.slug, tagline: product.tagline }),
        }),
        fetch(`/api/products/${id}/segments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments }),
        }),
      ])
      if (!metaRes.ok || !segRes.ok) throw new Error()
      toast.success("Saved")
    } catch { toast.error("Save failed") }
    finally { setSaving(false) }
  }

  async function cycleStatus() {
    if (!product) return
    const next = STATUS_CYCLE[product.status]
    setCycling(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      setProduct(p => p ? { ...p, status: next } : p)
      toast.success(STATUS_LABEL[next])
    } catch { toast.error("Failed") }
    finally { setCycling(false) }
  }

  function toggleSegment(segId: string) {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, visible: !s.visible } : s))
  }

  if (loading) {
    return (
      <div className="flex items-center py-32 gap-1.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-1 h-1 rounded-full bg-amber animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    )
  }

  if (!product) {
    return <p className="font-mono text-xs text-slate py-20">Product not found.</p>
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-border pb-8">
        <div>
          <button onClick={() => router.push("/admin")}
            className="font-mono text-xs text-slate hover:text-foreground transition-colors block mb-3">
            ← Products
          </button>
          <h1 className="font-display text-4xl font-extrabold text-foreground leading-none">
            {product.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cycleStatus}
            disabled={cycling}
            className={`font-mono text-xs border rounded-sm px-3 py-2 transition-all hover:border-amber/40 hover:text-amber disabled:opacity-40 ${STATUS_COLOR[product.status]}`}
          >
            {cycling ? "·" : STATUS_LABEL[product.status]}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="font-mono text-xs bg-amber text-background px-4 py-2 rounded-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-amber uppercase tracking-widest">Details</span>
          <div className="rule-amber flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Name",    key: "name",    mono: false },
            { label: "Slug",    key: "slug",    mono: true  },
          ].map(({ label, key, mono }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-slate">{label}</label>
              <input
                type="text"
                value={(product as unknown as Record<string, string>)[key]}
                onChange={e => setProduct(p => p ? { ...p, [key]: e.target.value } : p)}
                className={`bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber/30 transition-colors ${mono ? "font-mono" : ""}`}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="font-mono text-xs text-slate">Tagline</label>
            <input
              type="text"
              value={product.tagline}
              onChange={e => setProduct(p => p ? { ...p, tagline: e.target.value } : p)}
              className="bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Segments */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-amber uppercase tracking-widest">Segments</span>
          <div className="rule-amber flex-1" />
        </div>

        {segments.length === 0 ? (
          <div className="border border-dashed border-border rounded py-10 flex flex-col items-center gap-2">
            <span className="font-mono text-xs text-slate">No segments generated yet.</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {segments.map((seg, i) => {
              const locked = LOCKED.has(seg.type)
              return (
                <motion.div
                  key={seg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-4 border-b border-border"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-slate tabular-nums w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs text-foreground uppercase tracking-wider">
                      {seg.type.replace(/_/g, " ")}
                    </span>
                    {locked && (
                      <span className="font-mono text-xs text-slate/40">always on</span>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => !locked && toggleSegment(seg.id)}
                    disabled={locked}
                    aria-label={seg.visible ? "Hide segment" : "Show segment"}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                      seg.visible ? "bg-amber" : "bg-elevated border border-border"
                    } ${locked ? "opacity-25 cursor-default" : "cursor-pointer"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform duration-200 ${
                      seg.visible ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
