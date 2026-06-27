import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { SYSTEM_PROMPT } from "@/lib/ai-prompts"
import type { AISession, AIMessage } from "@/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { sessionId } = await request.json()

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE id = $1`,
    [sessionId]
  )
  if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  const messages: AIMessage[] = aiSession.messages ?? []

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      {
        role: "user",
        content: "Based on everything we've discussed, please generate the complete structured form JSON now.",
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) {
    return NextResponse.json({ error: "Claude did not return valid JSON" }, { status: 422 })
  }

  let form
  try {
    const parsed = JSON.parse(match[1])
    form = parsed.form
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude's response" }, { status: 422 })
  }

  const hero = form?.segments?.hero
  if (!hero?.headline || !hero?.description) {
    return NextResponse.json(
      { error: "Generated form is missing hero headline or description — please provide more product details and try again." },
      { status: 422 }
    )
  }

  const assistantMessage: AIMessage = {
    role: "assistant",
    content: text,
    timestamp: new Date().toISOString(),
  }
  messages.push(assistantMessage)

  await query(
    `UPDATE ai_sessions SET messages = $2, status = 'form_review', updated_at = now() WHERE id = $1`,
    [sessionId, JSON.stringify(messages)]
  )

  return NextResponse.json({ form })
}
