import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { auth } from "@/lib/auth"

// One-time admin account creation. Only works when no users exist.
export async function POST(request: NextRequest) {
  const existing = await queryOne(`SELECT id FROM "user" LIMIT 1`)
  if (existing) {
    return NextResponse.json({ error: "Admin already exists" }, { status: 409 })
  }

  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  await auth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  })

  return NextResponse.json({ ok: true })
}
