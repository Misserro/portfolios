"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"

export default function AdminNav() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out")
    router.push("/")
  }

  return (
    <header className="border-b border-border px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-display text-base font-bold text-foreground hover:text-amber transition-colors">
          sfer<span className="text-amber">.</span>
        </Link>
        <div className="w-px h-4 bg-border" />
        <Link href="/admin" className="font-mono text-xs text-slate hover:text-foreground transition-colors uppercase tracking-wider">
          Dashboard
        </Link>
      </div>
      <button
        onClick={handleSignOut}
        className="font-mono text-xs text-slate hover:text-foreground transition-colors uppercase tracking-wider"
      >
        Sign out
      </button>
    </header>
  )
}
