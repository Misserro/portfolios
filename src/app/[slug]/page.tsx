import { notFound } from "next/navigation"
import { query, queryOne } from "@/lib/db"
import type {
  Product, Segment,
  HeroContent, PreviewContent, FeaturesContent,
  HowItWorksContent, StatsContent, TestimonialsContent, CTAContent,
} from "@/types"
import HeroBlock from "@/components/segments/HeroBlock"
import PreviewBlock from "@/components/segments/PreviewBlock"
import FeaturesGrid from "@/components/segments/FeaturesGrid"
import HowItWorksBlock from "@/components/segments/HowItWorksBlock"
import StatsBlock from "@/components/segments/StatsBlock"
import TestimonialsBlock from "@/components/segments/TestimonialsBlock"
import CTABlock from "@/components/segments/CTABlock"
import HeroCanvas from "@/components/HeroCanvas"
import Link from "next/link"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  const product = await queryOne<Product>(
    `SELECT * FROM products WHERE slug = $1 AND status = 'published'`,
    [slug]
  )
  if (!product) notFound()

  const segments = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 AND visible = true ORDER BY "order" ASC`,
    [product.id]
  )

  // Extract data from other segments so the hero viz can use real content
  const featSeg  = segments.find(s => s.type === "features")
  const stepSeg  = segments.find(s => s.type === "how_it_works")
  const statSeg  = segments.find(s => s.type === "stats")
  const features = (featSeg?.content as FeaturesContent | undefined)?.features ?? []
  const steps    = (stepSeg?.content as HowItWorksContent | undefined)?.steps   ?? []
  const stats    = (statSeg?.content as StatsContent | undefined)?.stats         ?? []

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden">
      <HeroCanvas />
      <div className="hero-bloom pointer-events-none" />

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
          switch (segment.type) {
            case "hero":
              return (
                <HeroBlock
                  key={segment.id}
                  content={segment.content as HeroContent}
                  features={features}
                  steps={steps}
                  stats={stats}
                  productName={product.name}
                />
              )
            case "preview":
              return <PreviewBlock key={segment.id} content={segment.content as PreviewContent} />
            case "features":
              return <FeaturesGrid key={segment.id} content={segment.content as FeaturesContent} />
            case "how_it_works":
              return <HowItWorksBlock key={segment.id} content={segment.content as HowItWorksContent} />
            case "stats":
              return <StatsBlock key={segment.id} content={segment.content as StatsContent} />
            case "testimonials":
              return <TestimonialsBlock key={segment.id} content={segment.content as TestimonialsContent} />
            case "cta":
              return <CTABlock key={segment.id} content={segment.content as CTAContent} />
            default:
              return null
          }
        })}
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await queryOne<Product>(
    `SELECT name, tagline FROM products WHERE slug = $1`,
    [slug]
  )
  if (!product) return {}
  return {
    title: `${product.name} — sfer`,
    description: product.tagline,
  }
}
