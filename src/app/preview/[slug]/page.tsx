import { notFound } from "next/navigation"
import { query, queryOne } from "@/lib/db"
import type {
  Product, Segment,
  HeroContent, PreviewContent, FeaturesContent,
  HowItWorksContent, StatsContent, TestimonialsContent, CTAContent, MapContent,
} from "@/types"
import HeroBlock from "@/components/segments/HeroBlock"
import PreviewBlock from "@/components/segments/PreviewBlock"
import FeaturesGrid from "@/components/segments/FeaturesGrid"
import HowItWorksBlock from "@/components/segments/HowItWorksBlock"
import StatsBlock from "@/components/segments/StatsBlock"
import TestimonialsBlock from "@/components/segments/TestimonialsBlock"
import CTABlock from "@/components/segments/CTABlock"
import MapBlock from "@/components/segments/MapBlock"
import Link from "next/link"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ highlight?: string }>
}

export const dynamic = "force-dynamic"

export default async function PreviewPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { highlight } = await searchParams

  const product = await queryOne<Product>(
    `SELECT * FROM products WHERE slug = $1 AND status IN ('preview', 'published')`,
    [slug]
  )
  if (!product) notFound()

  const segments = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [product.id]
  )

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 dot-grid" />

      {/* Preview banner */}
      <div className="relative z-20 bg-amber/10 border-b border-amber/30 px-8 py-2 flex items-center justify-between">
        <span className="font-mono text-xs text-amber">
          preview — not publicly indexed
        </span>
        <Link href="/admin" className="font-mono text-xs text-slate hover:text-foreground transition-colors">
          ← admin
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 px-8 py-5 border-b border-border flex items-center gap-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-foreground hover:text-amber transition-colors">
          sfer<span className="text-amber">.</span>
        </Link>
        <span className="text-border font-mono">·</span>
        <span className="font-mono text-xs text-slate uppercase tracking-wider">{product.name}</span>
      </nav>

      {/* Segments */}
      <div className="relative z-10">
        {segments.map(segment => {
          const isHighlighted = highlight === segment.type
          return (
            <div
              key={segment.id}
              id={`segment-${segment.type}`}
              className={isHighlighted ? "ring-2 ring-amber/40 ring-offset-2 ring-offset-background transition-all duration-700" : ""}
            >
              {(() => {
                switch (segment.type) {
                  case "hero":
                    return <HeroBlock content={segment.content as HeroContent} />
                  case "preview":
                    return <PreviewBlock content={segment.content as PreviewContent} />
                  case "features":
                    return <FeaturesGrid content={segment.content as FeaturesContent} />
                  case "how_it_works":
                    return <HowItWorksBlock content={segment.content as HowItWorksContent} />
                  case "stats":
                    return <StatsBlock content={segment.content as StatsContent} />
                  case "testimonials":
                    return <TestimonialsBlock content={segment.content as TestimonialsContent} />
                  case "cta":
                    return <CTABlock content={segment.content as CTAContent} />
                  case "map":
                    return <MapBlock content={segment.content as MapContent} />
                  default:
                    return null
                }
              })()}
            </div>
          )
        })}
      </div>
    </main>
  )
}
