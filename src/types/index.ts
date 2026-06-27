export type ProductStatus = "draft" | "preview" | "published"

export type SegmentType =
  | "hero"
  | "preview"
  | "features"
  | "how_it_works"
  | "stats"
  | "testimonials"
  | "cta"

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
  }[]
}

export interface HowItWorksContent {
  steps: {
    title: string
    description: string
  }[]
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
