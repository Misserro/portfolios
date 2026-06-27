import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { Segment } from "@/types"

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { segments } = await request.json() as { segments: Omit<Segment, "id" | "updated_at">[] }

  await query(`DELETE FROM segments WHERE product_id = $1`, [id])

  if (segments.length > 0) {
    const values = segments.flatMap((s, i) => [
      id, s.type, JSON.stringify(s.content), s.visible, s.order
    ])
    const placeholders = segments.map((_, i) =>
      `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
    ).join(", ")

    await query(
      `INSERT INTO segments (product_id, type, content, visible, "order") VALUES ${placeholders}`,
      values
    )
  }

  const updated = await query<Segment>(
    `SELECT * FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [id]
  )

  return NextResponse.json(updated)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { type, content, visible } = await request.json()

  const [segment] = await query<Segment>(
    `UPDATE segments SET content = $3, visible = $4, updated_at = now()
     WHERE product_id = $1 AND type = $2
     RETURNING *`,
    [id, type, JSON.stringify(content), visible ?? true]
  )

  if (!segment) {
    const [created] = await query<Segment>(
      `INSERT INTO segments (product_id, type, content, visible, "order")
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX("order"), 0) + 1 FROM segments WHERE product_id = $1))
       RETURNING *`,
      [id, type, JSON.stringify(content), visible ?? true]
    )
    return NextResponse.json(created)
  }

  return NextResponse.json(segment)
}
