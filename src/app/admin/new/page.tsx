"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AIBuilder from "@/components/admin/AIBuilder"

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState<"init" | "build">("init")
  const [productId, setProductId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug, tagline: "" }),
      })

      if (!productRes.ok) {
        const err = await productRes.json()
        toast.error(err.error ?? "Failed to create product")
        return
      }

      const product = await productRes.json()

      const sessionRes = await fetch("/api/ai/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })

      if (!sessionRes.ok) throw new Error()
      const session = await sessionRes.json()

      setProductId(product.id)
      setSessionId(session.id)
      setStep("build")
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "build" && productId && sessionId) {
    return (
      <AIBuilder
        productId={productId}
        sessionId={sessionId}
        productName={name}
        onComplete={() => router.push("/admin")}
      />
    )
  }

  return (
    <div className="max-w-lg">
      <p className="font-mono text-xs text-amber uppercase tracking-widest mb-2">New product</p>
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        What are we building?
      </h1>

      <form onSubmit={handleStart} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-slate uppercase tracking-wider">
            Product name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Kaucjago"
            autoFocus
            required
            className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/40 transition-colors font-mono"
          />
          <p className="font-mono text-xs text-slate">
            You can change the name and slug later.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-amber text-background font-display font-bold text-sm rounded py-3 hover:bg-amber/90 transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? "Starting…" : "Start building →"}
        </button>
      </form>
    </div>
  )
}
