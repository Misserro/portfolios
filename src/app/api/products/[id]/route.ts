import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { Product, Segment } from "@/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: _req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const product = await queryOne<Product>(
    `SELECT * FROM products WHERE id = $1`,
    [id]
  )
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const segments = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [id]
  )

  return NextResponse.json({ ...product, segments })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await request.json()
  const allowed = ["name", "slug", "tagline", "status", "order"]
  const fields = Object.keys(body).filter(k => allowed.includes(k))

  if (fields.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const setClauses = fields.map((f, i) => `"${f}" = $${i + 2}`).join(", ")
  const values = fields.map(f => body[f])

  const [product] = await query<Product>(
    `UPDATE products SET ${setClauses}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...values]
  )

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(product)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  await query(`DELETE FROM products WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
