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

  const { sessionId, message } = await request.json()

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE id = $1`,
    [sessionId]
  )
  if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  const messages: AIMessage[] = aiSession.messages ?? []
  messages.push({ role: "user", content: message, timestamp: new Date().toISOString() })

  const anthropicMessages = messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: anthropicMessages,
  })

  const encoder = new TextEncoder()
  let fullText = ""

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const text = chunk.delta.text
          fullText += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }

      messages.push({ role: "assistant", content: fullText, timestamp: new Date().toISOString() })

      await query(
        `UPDATE ai_sessions SET messages = $2, updated_at = now() WHERE id = $1`,
        [sessionId, JSON.stringify(messages)]
      )

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
