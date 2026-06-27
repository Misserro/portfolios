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
      setError("Invalid credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="glass-elevated rounded-2xl p-8 glow-cyan">
              <p className="font-mono text-xs tracking-[0.25em] text-cyan uppercase mb-6">
                admin access
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan/50 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan/50 transition-colors"
                />
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan text-background font-display font-semibold text-sm rounded-lg py-3 hover:bg-cyan/90 transition-colors disabled:opacity-50"
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
