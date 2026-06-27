"use client"

import { useEffect } from "react"

interface HeaderProps {
  onAdminTrigger: () => void
}

export default function Header({ onAdminTrigger }: HeaderProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.shiftKey && e.key === "L") onAdminTrigger()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onAdminTrigger])

  return (
    <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border">
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        sfer<span className="text-amber">.</span>
      </span>
      <span className="font-mono text-xs tracking-[0.2em] text-slate uppercase">
        portfolio
      </span>
    </header>
  )
}
