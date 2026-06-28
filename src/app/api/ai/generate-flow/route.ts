import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import type { AISession, AIMessage } from "@/types"
import type { FlowSchema } from "@/types/flow"
import {
  FLOW_SYSTEM_PROMPT,
  FLOW_MERMAID_SYSTEM_PROMPT,
  FLOW_SCHEMA_SYSTEM_PROMPT,
  buildFlowChatMessages,
  buildMermaidPrompt,
  buildSchemaPrompt,
} from "@/lib/flow-ai-prompt"

const client = new Anthropic()

type FlowMessage = { role: 'user' | 'assistant'; content: string }

function formatProductContext(messages: AIMessage[]): string {
  return messages
    .filter((m, i) => !(i === 0 && m.role === "user"))
    .filter(m => !m.content.includes("```json"))
    .slice(-20)
    .map(m => `${m.role === "user" ? "ADMIN" : "CLAUDE"}: ${m.content}`)
    .join("\n\n")
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await req.json() as {
    action: 'chat' | 'mermaid' | 'schema'
    sessionId?: string
    messages?: FlowMessage[]
    mermaid?: string
  }

  // Load product context from main AI session
  let productContext = ""
  if (body.sessionId) {
    const aiSession = await queryOne<AISession>(
      `SELECT * FROM ai_sessions WHERE id = $1`,
      [body.sessionId]
    )
    if (aiSession?.messages) {
      productContext = formatProductContext(aiSession.messages as AIMessage[])
    }
  }

  if (body.action === 'schema') {
    if (!body.mermaid) return NextResponse.json({ error: "mermaid required" }, { status: 400 })

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: FLOW_SCHEMA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildSchemaPrompt(body.mermaid) }],
    })

    const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
    try {
      const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
      const schema = JSON.parse(jsonStr) as FlowSchema
      return NextResponse.json({ schema })
    } catch {
      return NextResponse.json({ error: "Failed to parse schema" }, { status: 500 })
    }
  }

  if (body.action === 'mermaid') {
    const messages = body.messages ?? []
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: FLOW_MERMAID_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildMermaidPrompt(messages, productContext) }],
    })

    const mermaid = msg.content[0].type === "text" ? msg.content[0].text.trim() : ""
    return NextResponse.json({ mermaid })
  }

  // action === 'chat' — streaming
  const flowMessages = buildFlowChatMessages(body.messages ?? [], productContext)

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: FLOW_SYSTEM_PROMPT,
    messages: flowMessages,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
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
