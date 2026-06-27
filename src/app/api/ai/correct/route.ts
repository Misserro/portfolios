import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { SYSTEM_PROMPT } from "@/lib/ai-prompts"
import type { AISession, AIMessage, Segment } from "@/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { sessionId, productId, message } = await request.json() as {
    sessionId: string
    productId: string
    message: string
  }

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE id = $1`,
    [sessionId]
  )
  if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  // Load current segments so Claude knows what it's correcting
  const segments = await query<Segment>(
    `SELECT type, content FROM segments WHERE product_id = $1 ORDER BY "order" ASC`,
    [productId]
  )
  const segmentContext = segments.map(s => `[${s.type}]: ${JSON.stringify(s.content)}`).join("\n\n")

  const messages: AIMessage[] = aiSession.messages ?? []

  const correctionPrompt = `The product page is now live in preview. Here is the current content of each segment:\n\n${segmentContext}\n\nThe admin says: ${message}\n\nIdentify which segment needs updating and output a segment_update JSON block.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: correctionPrompt },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Parse segment_update from Claude's response
  const match = text.match(/```json\s*([\s\S]*?)```/)
  let updatedSegment: { type: string; content: unknown } | null = null

  if (match) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.segment_update) {
        updatedSegment = parsed.segment_update
      }
    } catch {
      // Claude responded but without parseable JSON — return the message without DB update
    }
  }

  // Apply the segment update to the DB
  if (updatedSegment) {
    await query(
      `UPDATE segments SET content = $3, updated_at = now()
       WHERE product_id = $1 AND type = $2`,
      [productId, updatedSegment.type, JSON.stringify(updatedSegment.content)]
    )
  }

  // Save messages to session
  messages.push(
    { role: "user", content: message, timestamp: new Date().toISOString() },
    { role: "assistant", content: text, timestamp: new Date().toISOString() }
  )

  await query(
    `UPDATE ai_sessions SET messages = $2, updated_at = now() WHERE id = $1`,
    [sessionId, JSON.stringify(messages)]
  )

  return NextResponse.json({
    message: text,
    updatedSegmentType: updatedSegment?.type ?? null,
  })
}
