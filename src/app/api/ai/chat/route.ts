import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { SYSTEM_PROMPT } from "@/lib/ai-prompts"
import type { AISession, AIMessage, AIFileAttachment } from "@/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "file"; file_id: string } }
  | { type: "image"; source: { type: "file"; file_id: string } }

function buildContent(msg: AIMessage): string | AnthropicContent[] {
  if (!msg.attachments?.length) return msg.content

  const blocks: AnthropicContent[] = msg.attachments.map((att: AIFileAttachment) => {
    const isImage = att.content_type.startsWith("image/")
    return isImage
      ? { type: "image", source: { type: "file", file_id: att.file_id } }
      : { type: "document", source: { type: "file", file_id: att.file_id } }
  })

  if (msg.content) {
    blocks.push({ type: "text", text: msg.content })
  }

  return blocks
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { sessionId, message, attachments } = await request.json() as {
    sessionId: string
    message: string
    attachments?: AIFileAttachment[]
  }

  const aiSession = await queryOne<AISession>(
    `SELECT * FROM ai_sessions WHERE id = $1`,
    [sessionId]
  )
  if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  const messages: AIMessage[] = aiSession.messages ?? []
  const newMessage: AIMessage = {
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
    ...(attachments?.length ? { attachments } : {}),
  }
  messages.push(newMessage)

  const anthropicMessages = messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: buildContent(m),
  }))

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: anthropicMessages as any,
  })

  const encoder = new TextEncoder()
  let fullText = ""

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }

        messages.push({
          role: "assistant",
          content: fullText,
          timestamp: new Date().toISOString(),
        })

        await query(
          `UPDATE ai_sessions SET messages = $2, updated_at = now() WHERE id = $1`,
          [sessionId, JSON.stringify(messages)]
        )

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } finally {
        controller.close()
      }
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
