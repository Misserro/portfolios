import { NextResponse } from "next/server"
import { query } from "@/lib/db"
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
