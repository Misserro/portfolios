"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Mermaid } from "mermaid"
import type { FlowSchema } from "@/types/flow"

type FlowBuilderPhase = "chat" | "mermaid_preview" | "done"
type FlowMessage = { role: "user" | "assistant"; content: string }

interface Props {
  sessionId: string
  onSchema: (schema: FlowSchema) => void
}

export default function FlowBuilder({ sessionId, onSchema }: Props) {
  const [phase, setPhase]           = useState<FlowBuilderPhase>("chat")
  const [messages, setMessages]     = useState<FlowMessage[]>([])
  const [input, setInput]           = useState("")
  const [streaming, setStreaming]   = useState(false)
  const [streamText, setStreamText] = useState("")
  const [mermaid, setMermaid]       = useState("")
  const [renderedSvg, setRenderedSvg] = useState("")
  const [generatingMermaid, setGeneratingMermaid] = useState(false)
  const [generatingSchema, setGeneratingSchema]   = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const hasBooted  = useRef(false)
  const mermaidRef = useRef<Mermaid | null>(null)

  // Load mermaid client-side only
  useEffect(() => {
    import("mermaid").then(m => {
      mermaidRef.current = m.default
      m.default.initialize({
        theme: "dark",
        themeVariables: {
          primaryColor: "#111217",
          primaryBorderColor: "#F4A23A",
          primaryTextColor: "#F4F5F7",
          lineColor: "#F4A23A",
          background: "#08090B",
          edgeLabelBackground: "#08090B",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
        },
        flowchart: { curve: "basis", htmlLabels: false },
      })
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamText])

  // Render mermaid whenever it changes
  useEffect(() => {
    if (!mermaid || !mermaidRef.current) return
    const id = `mermaid-${Date.now()}`
    mermaidRef.current.render(id, mermaid)
      .then(({ svg }: { svg: string }) => setRenderedSvg(svg))
      .catch(() => setRenderedSvg(""))
  }, [mermaid])

  // Boot the chat
  useEffect(() => {
    if (hasBooted.current) return
    hasBooted.current = true
    sendMessage("Let's design the interactive flow for this product. Ask me what you need to know.")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(content: string) {
    if (streaming) return
    const userMsg: FlowMessage = { role: "user", content }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setStreaming(true)
    setStreamText("")

    try {
      const res = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          sessionId,
          messages: updatedMessages,
        }),
      })
      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))
        for (const line of lines) {
          const data = JSON.parse(line.slice(6))
          if (data.text) { accumulated += data.text; setStreamText(accumulated) }
          if (data.done) {
            setMessages(prev => [...prev, { role: "assistant", content: accumulated }])
            setStreamText("")
          }
        }
      }
    } catch {
      toast.error("Message failed")
    } finally {
      setStreaming(false)
    }
  }

  async function generateMermaid(advancePhase: boolean) {
    setGeneratingMermaid(true)
    try {
      const res = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mermaid", sessionId, messages }),
      })
      if (!res.ok) throw new Error()
      const { mermaid: generated } = await res.json()
      setMermaid(generated)
      if (advancePhase) setPhase("mermaid_preview")
    } catch {
      toast.error("Failed to generate diagram")
    } finally {
      setGeneratingMermaid(false)
    }
  }

  async function handleGenerateAnimation() {
    if (!mermaid) return
    setGeneratingSchema(true)
    try {
      const res = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schema", mermaid, sessionId }),
      })
      if (!res.ok) throw new Error()
      const { schema } = await res.json()
      onSchema(schema)
      setPhase("done")
      toast.success("Flow animation generated")
    } catch {
      toast.error("Failed to generate animation")
    } finally {
      setGeneratingSchema(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
  }

  if (phase === "done") {
    return (
      <div className="flex items-center gap-3 py-4">
        <span className="text-amber text-sm">✓</span>
        <span className="font-mono text-xs text-amber">Flow animation generated</span>
        <button
          onClick={() => setPhase("chat")}
          className="font-mono text-xs text-slate hover:text-foreground transition-colors ml-auto"
        >
          rebuild
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chat */}
      <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
        {messages.filter((_, i) => !(i === 0 && messages[i].role === "user")).map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%] ${msg.role === "user" ? "self-end" : "self-start"}`}>
            <span className={`font-mono text-[10px] ${msg.role === "user" ? "text-slate" : "text-amber"}`}>
              {msg.role === "user" ? "you" : "claude"}
            </span>
            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-elevated border border-border rounded-sm px-3 py-2 text-foreground" : "text-foreground/80"}`}>
              {msg.content}
            </p>
          </div>
        ))}
        {streamText && (
          <div className="self-start max-w-[85%]">
            <span className="font-mono text-[10px] text-amber block mb-1">claude</span>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">
              {streamText}
              <span className="inline-block w-0.5 h-3 bg-amber ml-0.5 animate-pulse align-middle" />
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat input */}
      {phase === "chat" && (
        <>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Reply…"
              disabled={streaming}
              className="flex-1 bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-slate/40 focus:outline-none focus:border-amber/30 transition-colors disabled:opacity-40"
            />
            <button type="submit" disabled={!input.trim() || streaming}
              className="font-mono text-xs bg-amber/10 border border-amber/20 text-amber px-3 py-2 rounded-sm hover:bg-amber/20 transition-colors disabled:opacity-30">
              →
            </button>
          </form>
          <button
            onClick={() => generateMermaid(true)}
            disabled={generatingMermaid || streaming || messages.length < 2}
            className="font-mono text-xs border border-amber/30 text-amber px-4 py-2 rounded-sm hover:bg-amber/8 transition-colors disabled:opacity-30 self-start"
          >
            {generatingMermaid ? "Drawing diagram…" : "Draw diagram →"}
          </button>
        </>
      )}

      {/* Mermaid preview */}
      <AnimatePresence>
        {phase === "mermaid_preview" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-amber uppercase tracking-widest">Diagram preview</span>
              <div className="rule-amber flex-1" />
            </div>

            {renderedSvg ? (
              <div
                className="w-full overflow-auto border border-border rounded-sm p-4 bg-surface"
                dangerouslySetInnerHTML={{ __html: renderedSvg }}
              />
            ) : (
              <pre className="font-mono text-[10px] text-slate bg-surface border border-border rounded-sm p-4 overflow-auto whitespace-pre-wrap">
                {mermaid}
              </pre>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPhase("chat")}
                className="font-mono text-xs text-slate hover:text-foreground border border-border px-3 py-2 rounded-sm transition-colors"
              >
                ← Refine in chat
              </button>
              <button
                onClick={() => generateMermaid(false)}
                disabled={generatingMermaid}
                className="font-mono text-xs text-slate hover:text-amber border border-border px-3 py-2 rounded-sm transition-colors disabled:opacity-30"
              >
                {generatingMermaid ? "Regenerating…" : "Redraw"}
              </button>
              <button
                onClick={handleGenerateAnimation}
                disabled={generatingSchema || !mermaid}
                className="font-mono text-xs bg-amber text-background px-4 py-2 rounded-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-40 ml-auto"
              >
                {generatingSchema ? "Generating…" : "Generate animation →"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
