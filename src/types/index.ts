export type ProductStatus = "draft" | "preview" | "published"

export type SegmentType =
  | "hero"
  | "preview"
  | "features"
  | "how_it_works"
  | "stats"
  | "testimonials"
  | "cta"
  | "map"

export interface Product {
  id: string
  name: string
  slug: string
  tagline: string
  status: ProductStatus
  order: number
  created_at: string
  updated_at: string
  segments?: Segment[]
}

export interface Segment {
  id: string
  product_id: string
  type: SegmentType
  content: SegmentContent
  visible: boolean
  order: number
  updated_at: string
}

// Per-segment content shapes — Claude outputs these as JSON

export interface HeroContent {
  headline: string
  subheadline: string
  description: string
  tags: string[]
  logo_url?: string  // product logo, displayed in place of viz on hero right side
  viz_svg?: string   // legacy
  viz_url?: string   // legacy
}

export interface PreviewContent {
  video_url: string
  mockup_images: string[]
  caption: string
}

export interface FeaturesContent {
  features: {
    title: string
    description: string
    icon?: string
    icon_svg?: string  // Claude-generated SVG inner content, stored after build
  }[]
}

export interface HowItWorksContent {
  steps: {
    title: string
    description: string
  }[]
  flow_svg?: string  // programmatic animated flow diagram
}

export interface MapContent {
  label?: string
  countries: string[]                                   // ISO alpha-2 codes to highlight
  cities: { name: string; coordinates: [number, number] }[]  // [lng, lat]
  center: [number, number]                              // [lng, lat]
  scale: number                                         // projection scale (800 = world, 3000 = country)
}

export interface StatsContent {
  stats: {
    label: string
    value: string
    note?: string
  }[]
}

export interface TestimonialsContent {
  testimonials: {
    quote: string
    author: string
    role: string
    company: string
  }[]
}

export interface CTAContent {
  headline: string
  description: string
  button_label: string
  button_url: string
}

export type SegmentContent =
  | HeroContent
  | PreviewContent
  | FeaturesContent
  | HowItWorksContent
  | StatsContent
  | TestimonialsContent
  | CTAContent
  | MapContent

// AI session types

export type AISessionStatus = "clarifying" | "form_review" | "draft" | "approved"

export interface AISession {
  id: string
  product_id: string
  messages: AIMessage[]
  status: AISessionStatus
  created_at: string
  updated_at: string
}

export interface AIFileAttachment {
  file_id: string
  content_type: string
  name: string
}

export interface AIMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
  attachments?: AIFileAttachment[]
}
