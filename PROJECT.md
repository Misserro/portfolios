# Portfolios — sfer.co Product Showcase

## Overview

**Project name:** portfolios  
**Owner:** sfer.co  
**Purpose:** A standalone, investor-facing product showcase site where sfer.co's built projects are presented in depth — with interactive previews, feature breakdowns, statistics, and AI-generated content pages.  
**Deployment:** Railway (standalone), connected via GitHub CI/CD  
**Eventual domain:** `portfolios.sfer.co` (subdomain, wired up post-launch)  
**Repository:** GitHub → Railway (auto-deploy on push to main)

---

## Audience

- **Primary:** Investors — want traction, growth metrics, business outcomes
- **Secondary:** Potential clients — want to feel the product before committing

Content tone and depth should serve both: business-outcome framing for investors, product-feel for clients.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Components | shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | BetterAuth |
| AI | Claude API (Anthropic) |
| Deployment | Railway |
| CI/CD | GitHub → Railway (auto-deploy) |
| UI Generation | 21st.dev Magic MCP |
| Design Skill | frontend-design (Anthropic official skill) |

---

## Design System

**Aesthetic:** Dark glassmorphism + sci-fi motion  
**Core elements:**
- Deep dark background (near-black)
- Frosted glass product cards
- Subtle particle or grid background layer
- Smooth scroll-triggered animations (Framer Motion)
- Neon/accent color highlights
- High-quality typography

**Rule:** Claude only ever outputs structured JSON content. The frontend renders all visual output via a fixed set of pre-built styled components. Claude never touches HTML, CSS, or visual presentation — consistency is guaranteed by the component library, not by AI instruction-following.

---

## Public Site

### Landing Page

- Product card grid
- 3–8 products initially, architected to scale beyond that (no hardcoded limits, dynamic routing)
- Each card: product name, short tagline, animated mockup thumbnail

### Product Page (`/[slug]`)

Each product has a dedicated dynamic route. Segments are rendered via fixed styled components:

| Segment | Always visible | Admin-toggleable |
|---|---|---|
| Hero (name, tagline, overview) | Yes | No |
| Preview (animated mockup + autoplay video) | Yes | No |
| How It Works | No | Yes |
| Features | No | Yes |
| Statistics | No | Yes |
| Testimonials / Case Studies | No | Yes |
| CTA (contact / learn more) | No | Yes |

**Statistics display rule:** Always shown as ranges or growth metrics — never hard absolute numbers. Examples: "€1M–5M ARR", "40+ clients", "3x revenue YoY". Competitors, employees, and acquirers can see this page; hard numbers are not published.

**Preview format:** Animated mockup screenshots + 30–60s autoplay video per product. No live iframes (too fragile), no interactive prototypes (too expensive per product).

---

## Admin Access

- **Entry point:** Keyboard shortcut `Shift+L` anywhere on the public site reveals a floating login modal
- **No visible button** — the trigger is invisible to regular visitors
- **Auth:** BetterAuth (email + password)
- **Scope:** Single admin user (sfer.co internal)

---

## Admin Dashboard

### Product Management

- Add / edit / delete products
- Set product order (numeric order field — no drag-and-drop for now)
- Publish / Draft toggle (hide a product from public without deleting it)
- Toggle which segments are visible per product
- Edit content within each segment via the AI Page Builder

### AI Page Builder — Full Flow

The AI Page Builder is the core admin feature. It uses Claude to generate product pages from raw input, with a three-stage pipeline:

#### Stage 1: Clarification Chat

1. Admin uploads one or more input documents **and/or** pastes raw text about the product
2. Accepted file formats: **PDF, DOCX, plain text, images**
3. Claude reads all input and begins an **unlimited chat** with the admin to clarify gaps
4. Claude asks questions until it has enough information to fill every segment confidently
5. Admin answers in natural language — no form-filling at this stage

#### Stage 2: Structured Form Pre-fill

1. Claude extracts all gathered information into a **structured form**
2. Form fields map to each segment: hero copy, feature list items, stat ranges, how-it-works steps, etc.
3. Missing fields are flagged — admin can fill them manually or continue chatting
4. Admin reviews and edits the form before proceeding

#### Stage 3: Rendered Draft + Approval

1. Claude generates a **structured JSON payload** from the confirmed form data
2. Frontend renders the JSON into a full product page draft using the fixed styled component library
3. Page is available at a **private preview URL** (e.g. `/preview/[slug]`) for internal review / sharing
4. Admin uses **chat-based corrections** to refine the rendered page:
   - Claude identifies which segment the instruction targets
   - Only that segment is regenerated — everything else is preserved
   - This continues until the admin is satisfied
5. Admin clicks **Go Live** — product is published publicly

#### Content Rules for Claude

- Claude outputs **structured JSON only** — never HTML, CSS, or styled output
- JSON maps to named segment types: `HeroBlock`, `FeatureGrid`, `StatCounter`, `HowItWorksTimeline`, `TestimonialBlock`, `CTABlock`
- Frontend components always render in the correct dark glassmorphism style regardless of Claude's output content
- Statistics in Claude's output must always be ranges or growth metrics, never hard numbers

---

## Data Model

### `products` table

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Product display name |
| slug | text | URL slug, unique |
| tagline | text | Short one-liner |
| status | enum | `draft` / `preview` / `published` |
| order | integer | Display order on landing page |
| created_at | timestamp | |
| updated_at | timestamp | |

### `segments` table

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | FK → products.id |
| type | enum | `hero`, `preview`, `features`, `how_it_works`, `stats`, `testimonials`, `cta` |
| content | jsonb | Segment content — shape varies by type |
| visible | boolean | Admin-toggleable per segment |
| order | integer | Display order within the product page |
| updated_at | timestamp | |

### `ai_sessions` table

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| product_id | uuid | FK → products.id |
| messages | jsonb | Full chat history (clarification + correction phases) |
| status | enum | `clarifying` / `form_review` / `draft` / `approved` |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## Publishing States

```
draft → preview → published
```

- **draft:** Visible in admin only, no public URL
- **preview:** Accessible at `/preview/[slug]` with a secret token — sharable internally
- **published:** Live on the public site at `/[slug]`

---

## Products

### Current

| Product | URL | Status |
|---|---|---|
| Kaucjago | kaucjago.com | First to be added — used as build/test reference |

### Planned

Products will be added via the AI Page Builder as the platform is live. Target: 3–8 active products, with architecture supporting unlimited scale.

---

## Key Constraints & Decisions

- **No statistics as hard numbers** — ranges and growth metrics only on the public site
- **Claude never writes visual code** — only structured JSON; components own the style
- **One clarification round = unlimited** — Claude chats freely before filling the form, not limited to one pass
- **Segment-level regeneration** — chat corrections only regenerate the targeted segment, never the full page
- **No drag-and-drop reordering** (yet) — order field is a simple integer
- **No scheduled publishing** (yet) — publish is immediate on Go Live click
- **Admin is a single keyboard shortcut away** — no visible login UI on the public site
- **BetterAuth** handles all authentication — no Supabase Auth

---

## Out of Scope (for now)

- Scheduled / timed publishing
- Drag-and-drop product reordering
- Multiple admin users / roles
- Public search or filtering of products
- Multilingual support
- Analytics dashboard (may add later — visitor stats, time on page per product)
