"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"

export default function AdminNav() {
  const router = useRouter()
  const pathname = usePathname()

  const crumb = pathname === "/admin"
    ? null
    : pathname === "/admin/new"
    ? "New product"
    : "Edit product"

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out")
    router.push("/")
  }

  return (
    <header className="border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 font-mono text-xs">
        <Link href="/" className="text-slate hover:text-foreground transition-colors">
          sfer<span className="text-amber">.</span>
        </Link>
        <span className="text-border">·</span>
        <Link href="/admin" className={crumb ? "text-slate hover:text-foreground transition-colors" : "text-foreground"}>
          control
        </Link>
        {crumb && (
          <>
            <span className="text-border">·</span>
            <span className="text-foreground">{crumb}</span>
          </>
        )}
      </div>

      <button
        onClick={handleSignOut}
        className="font-mono text-xs text-slate hover:text-foreground transition-colors"
      >
        sign out
      </button>
    </header>
  )
}
