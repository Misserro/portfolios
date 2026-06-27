"use client"

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Grid background */}
      <div className="pointer-events-none fixed inset-0 grid-background opacity-60" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-border">
        <span className="font-display text-xl font-semibold tracking-tight text-white">
          sfer<span className="text-cyan">.</span>
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24">
        <p className="font-mono text-xs tracking-[0.3em] text-cyan uppercase mb-6">
          sfer.co — product showcase
        </p>
        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05] max-w-4xl">
          Products built to{" "}
          <span className="text-cyan">last</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          A curated view of what we build — each project presented in full depth.
        </p>
      </section>

      {/* Product grid */}
      <section className="relative z-10 px-8 pb-32 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-8 flex flex-col gap-4 min-h-64">
            <div className="w-10 h-10 rounded-lg bg-cyan/10 border border-cyan/20" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-48 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Products load from the database once configured.
        </p>
      </section>
    </main>
  )
}
