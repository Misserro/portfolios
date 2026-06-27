"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { signIn } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

interface Props {
  open: boolean
  onClose: () => void
}

export default function AdminLoginModal({ open, onClose }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signIn.email({ email, password })
      onClose()
      router.push("/admin")
    } catch {
      setError("Credentials not recognised.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="surface-elevated rounded-lg p-8 glow-amber">
              {/* Amber top rule */}
              <div className="rule-amber mb-6 w-8" />
              <p className="font-mono text-xs tracking-[0.25em] text-slate uppercase mb-6">
                admin
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/40 transition-colors font-mono"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-input border border-border rounded px-4 py-3 text-sm text-foreground placeholder:text-slate focus:outline-none focus:border-amber/40 transition-colors font-mono"
                />
                {error && (
                  <p className="font-mono text-xs text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-amber text-background font-display font-bold text-sm rounded py-3 hover:bg-amber/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
