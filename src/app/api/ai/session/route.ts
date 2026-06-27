import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { AISession } from "@/types"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { productId } = await request.json()

  const [aiSession] = await (await import("@/lib/db")).query<AISession>(
    `INSERT INTO ai_sessions (product_id, messages, status)
     VALUES ($1, '[]', 'clarifying')
     RETURNING *`,
    [productId]
  )

  return NextResponse.json(aiSession, { status: 201 })
}
