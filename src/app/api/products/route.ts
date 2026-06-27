import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { Product, Segment } from "@/types"

export async function GET() {
  const products = await query<Product>(
    `SELECT * FROM products WHERE status = 'published' ORDER BY "order" ASC`
  )
  const enriched = await Promise.all(
    products.map(async product => {
      const segments = await query<Segment>(
        `SELECT * FROM segments WHERE product_id = $1 AND visible = true ORDER BY "order" ASC`,
        [product.id]
      )
      return { ...product, segments }
    })
  )
  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await request.json()
  const { name, slug, tagline } = body

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 })
  }

  const existing = await queryOne(
    `SELECT id FROM products WHERE slug = $1`,
    [slug]
  )
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
  }

  const [product] = await query<Product>(
    `INSERT INTO products (name, slug, tagline, status, "order")
     VALUES ($1, $2, $3, 'draft', (SELECT COALESCE(MAX("order"), 0) + 1 FROM products))
     RETURNING *`,
    [name, slug, tagline ?? ""]
  )

  return NextResponse.json(product, { status: 201 })
}
