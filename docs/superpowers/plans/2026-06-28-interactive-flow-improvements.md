# Interactive Flow Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix flow layout overflow, replace click-every-node interaction with auto-advance-until-decision, and improve AI label quality with strict formatting rules and richer descriptions.

**Architecture:** Three independent tasks. Task 1 fixes AI prompts and wires description generation through the schema route. Task 2 redesigns node components (drop diamond, center text, fade animation). Task 3 updates FlowCanvas with dynamic height, scroll-to-zoom, and the auto-advance state machine.

**Tech Stack:** Next.js App Router, React 19, `@xyflow/react` v12, `framer-motion`, `dagre`, Anthropic SDK (claude-sonnet-4-6), TypeScript.

## Global Constraints

- Design system colors: background `#08090B`, surface `#111217`, elevated `#16181F`, amber `#F4A23A`, orange `#F2843C`, border `rgba(255,255,255,0.08)`, foreground `#F4F5F7`, slate `#8A8F98`
- No glassmorphism, no backdrop-blur
- All node components must export `FlowNodeData` from `src/components/flow/FlowStepNode.tsx` (imported by decision and outcome nodes)
- `FlowNodeData` in `FlowStepNode.tsx` is the single source of truth for node data shape
- `ADVANCE_DELAY_MS = 800` — named constant, never a magic number
- No new npm packages; no database migrations; no API route additions
- TypeScript must compile clean: run `npx tsc --noEmit` after each task
- Commit after every task

---

### Task 1: AI Prompts, Description Field, Schema Route

**Files:**
- Modify: `src/types/flow.ts`
- Modify: `src/lib/flow-ai-prompt.ts`
- Modify: `src/app/api/ai/generate-flow/route.ts:56-64`
- Modify: `src/components/admin/FlowBuilder.tsx:138-156`

**Interfaces:**
- Produces: `buildSchemaPrompt(mermaid: string, productContext: string): string` — signature changes, Task 3 is unaffected (doesn't call this)
- Produces: `FlowNode.description: string` (was `description?: string`) — Tasks 2 and 3 read this; the existing `{d.description && ...}` guard handles empty strings, so no downstream breakage

- [ ] **Step 1: Make `description` required on `FlowNode`**

Replace the entire contents of `src/types/flow.ts`:

```typescript
export type FlowNodeType = 'step' | 'decision' | 'outcome'

export interface FlowNode {
  id: string
  type: FlowNodeType
  label: string
  description: string
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

export interface FlowSchema {
  title?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (existing `{d.description && ...}` guards handle empty string, old stored data may have `description: undefined` which is falsy — same behaviour).

- [ ] **Step 3: Rewrite `src/lib/flow-ai-prompt.ts`**

Replace the entire file:

```typescript
export const FLOW_SYSTEM_PROMPT = `You are a specialist in designing interactive product capability explorers — not process diagrams. Your job is to understand a product and design a branching flow that lets visitors explore its different service paths.

## Your role

Ask questions one at a time to understand:
- What are the distinct services or use cases the product offers?
- What decision does a user make when choosing between services?
- What happens in each service path?
- Are there shared entry steps before the first decision?
- What is the concrete outcome of each path?

Keep the graph simple: maximum 8 nodes, maximum 2 decision points. If the product has more steps, consolidate into phases.

## Labeling rules — memorise these, they apply to every flow you design

**Step nodes** — imperative verb phrase, user perspective, 2–4 words. Like a button label.
  ✅ "Book a Pickup", "Create Account", "Scan at Hub"
  ❌ "The user books a pickup", "Booking", "Account Creation Process"

**Decision nodes** — short natural-language question, 2–5 words. Concrete, sounds like a person.
  ✅ "Home or office?", "Monthly or one-off?", "Solo or team?"
  ❌ "Account Type", "Who are you?", "Which service?"

**Edge labels (paths from decisions)** — 2–3 word self-contained descriptor, readable alone.
  ✅ "Home pickup", "Office venue", "Monthly plan"
  ❌ "Home", "Business", "Yes", "Option A"

**Outcome nodes** — past-tense or noun result, 2–4 words.
  ✅ "Deposit credited", "Report delivered", "Balance updated"
  ❌ "Success", "Done", "The deposit has been credited to the user"

When the admin says they are ready, generate the Mermaid diagram — do not ask more questions.`

export const FLOW_MERMAID_SYSTEM_PROMPT = `You convert product capability conversations into Mermaid flowchart diagrams.

Output ONLY a valid Mermaid flowchart — no explanation, no markdown fences, just the raw Mermaid syntax.

## Labeling rules (apply exactly — these determine readability)

STEP nodes [Label]:
  ✅ "Book a Pickup", "Create Account", "Scan at Hub" — imperative verb, 2–4 words
  ❌ "Booking process", "Account creation", "The hub scans packages"

DECISION nodes {Label}:
  ✅ "Home or office?", "Monthly or one-off?" — short question, concrete
  ❌ "Account Type", "Service selection", "Which option?"

EDGE labels |label|:
  ✅ "Home pickup", "Office venue" — 2–3 words, self-contained
  ❌ "Home", "Yes", "Business", "Option A"

OUTCOME nodes ([Label]):
  ✅ "Deposit credited", "Balance updated" — past-tense or noun result, 2–4 words
  ❌ "Success", "Done", "Complete"

## Structure rules
- flowchart LR
- Maximum 8 nodes, maximum 2 decision points
- All paths must end at an outcome node
- No cycles, no failure paths
- Node IDs: lowercase alphanumeric with underscores only
- Plain edges: -->
- Decision edges: --> |label|

## Example output

flowchart LR
  create_account[Create Account]
  account_type{Home or office?}
  home_path[Schedule Home Pickup]
  office_path[Schedule Office Pickup]
  process[Count and Scan]
  result([Deposit Credited])
  create_account --> account_type
  account_type -->|Home pickup| home_path
  account_type -->|Office venue| office_path
  home_path --> process
  office_path --> process
  process --> result`

export const FLOW_SCHEMA_SYSTEM_PROMPT = `You convert a Mermaid flowchart and product context into a structured JSON schema with descriptions.

Output ONLY valid JSON — no explanation, no markdown fences.

## Node type mapping
- Rectangular [Label] → type: "step"
- Diamond {Label} → type: "decision"
- Stadium ([Label]) → type: "outcome"

## Description rules
- Step and outcome nodes: write a description (1 sentence, ≤80 chars, plain language).
  Base it on the product context. No "leverage", "seamlessly", "robust", "cutting-edge".
  Examples: "Pack bottles into bags and tie them shut.", "The courier picks up bags from your door."
- Decision nodes: description is always empty string "".

## Output shape (description is always present, never omitted)

{
  "nodes": [
    { "id": "node_id", "type": "step", "label": "Node Label", "description": "One plain sentence." },
    { "id": "decision_id", "type": "decision", "label": "Home or office?", "description": "" }
  ],
  "edges": [
    { "from": "source_id", "to": "target_id", "label": "optional edge label" }
  ]
}`

export function buildFlowChatMessages(
  messages: { role: 'user' | 'assistant'; content: string }[],
  productContext: string,
): { role: 'user' | 'assistant'; content: string }[] {
  if (!productContext) return messages
  return [
    { role: 'user' as const, content: `PRODUCT CONTEXT:\n${productContext}` },
    { role: 'assistant' as const, content: 'Understood. I have the product context. I\'ll use it to help design a flow that accurately reflects this product.' },
    ...messages,
  ]
}

export function buildMermaidPrompt(
  messages: { role: 'user' | 'assistant'; content: string }[],
  productContext: string,
): string {
  const convo = messages.map(m => `${m.role === 'user' ? 'ADMIN' : 'CLAUDE'}: ${m.content}`).join('\n\n')
  return `PRODUCT CONTEXT:\n${productContext}\n\nFLOW CONVERSATION:\n${convo}\n\nGenerate the Mermaid flowchart diagram based on this conversation.`
}

export function buildSchemaPrompt(mermaid: string, productContext: string): string {
  return `PRODUCT CONTEXT:\n${productContext || "(not available)"}\n\nMERMAID DIAGRAM:\n${mermaid}\n\nConvert to the JSON schema. Use the product context to write accurate, plain-language descriptions for each step and outcome node.`
}
```

- [ ] **Step 4: Pass `productContext` to schema generation in the route**

In `src/app/api/ai/generate-flow/route.ts`, find the schema action handler (line 56–74). Change only the `buildSchemaPrompt` call:

```typescript
// Before:
messages: [{ role: "user", content: buildSchemaPrompt(body.mermaid) }],

// After:
messages: [{ role: "user", content: buildSchemaPrompt(body.mermaid, productContext) }],
```

- [ ] **Step 5: Pass `sessionId` from FlowBuilder to the schema action**

In `src/components/admin/FlowBuilder.tsx`, find `handleGenerateAnimation` (around line 137). Change only the fetch body:

```typescript
// Before:
body: JSON.stringify({ action: "schema", mermaid }),

// After:
body: JSON.stringify({ action: "schema", mermaid, sessionId }),
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/flow.ts src/lib/flow-ai-prompt.ts src/app/api/ai/generate-flow/route.ts src/components/admin/FlowBuilder.tsx
git commit -m "feat: improve flow AI prompts, strict labeling rules, description generation"
```

---

### Task 2: Node Visual Redesign

**Files:**
- Modify: `src/components/flow/FlowStepNode.tsx`
- Modify: `src/components/flow/FlowDecisionNode.tsx`
- Modify: `src/components/flow/FlowOutcomeNode.tsx`

**Interfaces:**
- Consumes: `FlowNodeData` from `src/components/flow/FlowStepNode.tsx` — `pendingEdges`, `onChoose`, `isCurrentTip`, `active`, `label`, `description` (all already present from previous session's fixes)
- Decision node drops the diamond shape entirely. NodeToolbar choice buttons remain unchanged on all node types.

- [ ] **Step 1: Rewrite `FlowStepNode.tsx`**

Replace the entire file:

```typescript
"use client"

import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  description?: string
  active: boolean
  isCurrentTip: boolean
  pendingEdges?: Array<{ from: string; to: string; label?: string }>
  onChoose?: (edge: { from: string; to: string; label?: string }) => void
}

export default function FlowStepNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[180px] rounded-sm border px-4 py-3 cursor-default select-none transition-all duration-300 text-center ${
        d.active
          ? "bg-[#16181F] border-[#F4A23A] shadow-[0_0_18px_rgba(242,132,60,0.18)]"
          : "bg-[#111217] border-[rgba(255,255,255,0.08)]"
      }`}
      data-nodeid={id}
    >
      <p className={`font-display text-sm font-semibold leading-snug ${d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/70"}`}>
        {d.label}
      </p>
      {d.description && (
        <p className="mt-1 font-mono text-[10px] text-[#8A8F98] leading-relaxed">
          {d.description}
        </p>
      )}
      {d.isCurrentTip && (!d.pendingEdges || d.pendingEdges.length === 0) && (
        <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-[#F4A23A] animate-pulse mx-auto" />
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      {d.isCurrentTip && d.pendingEdges && d.pendingEdges.length > 0 && (
        <NodeToolbar isVisible position={Position.Bottom}>
          <div className="flex gap-1.5 pt-1">
            {d.pendingEdges.map((e, i) => (
              <button
                key={i}
                onClick={() => d.onChoose?.(e)}
                className="font-mono text-[10px] border border-[#F4A23A]/40 text-[#F4A23A] bg-[#08090B] px-2.5 py-1 rounded-sm hover:bg-[#F4A23A]/10 hover:border-[#F4A23A]/70 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                {e.label || "→"}
              </button>
            ))}
          </div>
        </NodeToolbar>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Rewrite `FlowDecisionNode.tsx`**

Replace the entire file. The diamond is gone — replaced with a rounded rectangle with an `⌥` fork indicator:

```typescript
"use client"

import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"
import type { FlowNodeData } from "./FlowStepNode"

export default function FlowDecisionNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[180px] rounded-sm border px-4 py-3 cursor-default select-none transition-all duration-300 text-center ${
        d.active
          ? "bg-[#16181F] border-[#F4A23A] shadow-[0_0_18px_rgba(242,132,60,0.18)]"
          : "bg-[#111217] border-[rgba(255,255,255,0.08)]"
      }`}
      data-nodeid={id}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className={`text-[10px] leading-none ${d.active ? "text-[#F4A23A]" : "text-[#F4A23A]/40"}`}>⌥</span>
        <p className={`font-display text-sm font-semibold leading-snug ${d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/70"}`}>
          {d.label}
        </p>
      </div>
      {d.description && (
        <p className="mt-1 font-mono text-[10px] text-[#8A8F98] leading-relaxed">
          {d.description}
        </p>
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      {d.isCurrentTip && d.pendingEdges && d.pendingEdges.length > 0 && (
        <NodeToolbar isVisible position={Position.Bottom}>
          <div className="flex gap-1.5 pt-1">
            {d.pendingEdges.map((e, i) => (
              <button
                key={i}
                onClick={() => d.onChoose?.(e)}
                className="font-mono text-[10px] border border-[#F4A23A]/40 text-[#F4A23A] bg-[#08090B] px-2.5 py-1 rounded-sm hover:bg-[#F4A23A]/10 hover:border-[#F4A23A]/70 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                {e.label || "→"}
              </button>
            ))}
          </div>
        </NodeToolbar>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 3: Rewrite `FlowOutcomeNode.tsx`**

Replace the entire file. Animation updated to y-drift; content row centered:

```typescript
"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { motion } from "framer-motion"
import type { FlowNodeData } from "./FlowStepNode"

export default function FlowOutcomeNode({ data, id }: NodeProps) {
  const d = data as FlowNodeData

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[180px] rounded-full border px-5 py-3 cursor-default select-none transition-all duration-300 text-center ${
        d.active
          ? "bg-[rgba(244,162,58,0.08)] border-[#F4A23A] shadow-[0_0_24px_rgba(242,132,60,0.22)]"
          : "bg-[#111217] border-[rgba(255,255,255,0.12)]"
      }`}
      data-nodeid={id}
    >
      <div className="flex items-center justify-center gap-2">
        <span className={`text-sm ${d.active ? "text-[#F4A23A]" : "text-[#F4F5F7]/30"}`}>✓</span>
        <p className={`font-display text-sm font-semibold leading-snug ${d.active ? "text-[#F4F5F7]" : "text-[#F4F5F7]/60"}`}>
          {d.label}
        </p>
      </div>
      {d.description && (
        <p className="mt-1.5 font-mono text-[10px] text-[#8A8F98] leading-relaxed">
          {d.description}
        </p>
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
    </motion.div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/flow/FlowStepNode.tsx src/components/flow/FlowDecisionNode.tsx src/components/flow/FlowOutcomeNode.tsx
git commit -m "feat: redesign flow nodes — drop diamond, center text, drift animation"
```

---

### Task 3: FlowCanvas — Auto-advance + Dynamic Height + Zoom

**Files:**
- Modify: `src/components/flow/FlowCanvas.tsx`

**Interfaces:**
- Consumes: `FlowEdge` from `@/types/flow`, `FlowNodeData` from `./FlowStepNode`
- No interface changes — this task is purely internal to FlowCanvas

**Context:** The current `FlowCanvas.tsx` has a fixed `style={{ height: 320 }}` container, `zoomOnScroll={false}`, `zoomOnPinch={false}`, and no auto-advance logic. The `revealNext` function is a plain function (not memoized). All of this changes in this task.

- [ ] **Step 1: Add `useCallback` to the import**

In `src/components/flow/FlowCanvas.tsx`, the existing import is:

```typescript
import { useCallback, useEffect, useMemo, useState } from "react"
```

`useCallback` is already imported — no change needed. Confirm it is present before continuing.

- [ ] **Step 2: Replace the entire `FlowCanvas.tsx`**

The full rewritten file. Read the current file first to understand what's being replaced, then write:

```typescript
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow, Background, BackgroundVariant, useReactFlow,
  type Node, type Edge,
} from "@xyflow/react"
import dagre from "dagre"
import "@xyflow/react/dist/style.css"
import type { FlowSchema, FlowNode, FlowEdge } from "@/types/flow"
import FlowStepNode from "./FlowStepNode"
import FlowDecisionNode from "./FlowDecisionNode"
import FlowOutcomeNode from "./FlowOutcomeNode"
import FlowAnimatedEdge from "./FlowAnimatedEdge"

const ADVANCE_DELAY_MS = 800

const NODE_W: Record<string, number> = { step: 180, decision: 180, outcome: 180 }
const NODE_H: Record<string, number> = { step: 90, decision: 80, outcome: 70 }

function computeLayout(
  schemaNodes: FlowNode[],
  schemaEdges: FlowEdge[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  schemaNodes.forEach(n => {
    g.setNode(n.id, { width: NODE_W[n.type] ?? 180, height: NODE_H[n.type] ?? 90 })
  })
  schemaEdges.forEach(e => g.setEdge(e.from, e.to))
  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  schemaNodes.forEach(n => {
    const pos = g.node(n.id)
    positions.set(n.id, {
      x: pos.x - (NODE_W[n.type] ?? 180) / 2,
      y: pos.y - (NODE_H[n.type] ?? 90) / 2,
    })
  })
  return positions
}

function findEntryNode(schemaNodes: FlowNode[], schemaEdges: FlowEdge[]): string {
  const hasIncoming = new Set(schemaEdges.map(e => e.to))
  return schemaNodes.find(n => !hasIncoming.has(n.id))?.id ?? schemaNodes[0]?.id ?? ""
}

const nodeTypes = {
  step: FlowStepNode,
  decision: FlowDecisionNode,
  outcome: FlowOutcomeNode,
}

const edgeTypes = {
  flowAnimated: FlowAnimatedEdge,
}

function AutoFitView({ revealedCount }: { revealedCount: number }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    fitView({ duration: 400, padding: 0.25 })
  }, [revealedCount, fitView])
  return null
}

export default function FlowCanvas({ schema }: { schema: FlowSchema }) {
  const entryId = useMemo(
    () => findEntryNode(schema.nodes, schema.edges),
    [schema.nodes, schema.edges],
  )
  const positions = useMemo(
    () => computeLayout(schema.nodes, schema.edges),
    [schema.nodes, schema.edges],
  )

  const containerHeight = useMemo(() => {
    let maxBottom = 0
    schema.nodes.forEach(n => {
      const pos = positions.get(n.id)
      if (!pos) return
      maxBottom = Math.max(maxBottom, pos.y + (NODE_H[n.type] ?? 90))
    })
    return maxBottom + 80
  }, [schema.nodes, positions])

  const [revealedIds, setRevealedIds] = useState<string[]>([entryId])
  const [revealedEdgeKeys, setRevealedEdgeKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRevealedIds([entryId])
    setRevealedEdgeKeys(new Set())
  }, [entryId])

  const currentTip = revealedIds[revealedIds.length - 1] ?? entryId

  const pendingEdges = useMemo(
    () => schema.edges.filter(e => e.from === currentTip && !revealedEdgeKeys.has(`${e.from}->${e.to}`)),
    [schema.edges, currentTip, revealedEdgeKeys],
  )

  const revealNext = useCallback((edge: FlowEdge) => {
    setRevealedIds(prev => [...prev, edge.to])
    setRevealedEdgeKeys(prev => new Set([...prev, `${edge.from}->${edge.to}`]))
  }, [])

  // Auto-advance when exactly one choice
  useEffect(() => {
    if (pendingEdges.length !== 1) return
    const edge = pendingEdges[0]
    const timer = setTimeout(() => revealNext(edge), ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pendingEdges, revealNext])

  const nodes: Node[] = schema.nodes
    .filter(n => revealedIds.includes(n.id))
    .map(n => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 }
      const isTip = n.id === currentTip
      return {
        id: n.id,
        type: n.type,
        position: pos,
        data: {
          label: n.label,
          description: n.description,
          active: true,
          isCurrentTip: isTip,
          pendingEdges: isTip ? pendingEdges : [],
          onChoose: isTip ? (edge: FlowEdge) => revealNext(edge) : undefined,
        },
        draggable: false,
      }
    })

  const edges: Edge[] = schema.edges
    .filter(e => revealedEdgeKeys.has(`${e.from}->${e.to}`))
    .map(e => ({
      id: `${e.from}->${e.to}`,
      source: e.from,
      target: e.to,
      type: "flowAnimated",
      data: { label: e.label, active: true, pending: false },
    }))

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const idx = revealedIds.indexOf(node.id)
      if (idx === -1 || idx === revealedIds.length - 1) return
      const keptIds = revealedIds.slice(0, idx + 1)
      const keptSet = new Set(keptIds)
      setRevealedIds(keptIds)
      setRevealedEdgeKeys(prev => {
        const next = new Set<string>()
        for (const key of prev) {
          const sepIdx = key.indexOf("->")
          const from = sepIdx !== -1 ? key.slice(0, sepIdx) : key
          const to = sepIdx !== -1 ? key.slice(sepIdx + 2) : ""
          if (keptSet.has(from) && keptSet.has(to)) next.add(key)
        }
        return next
      })
    },
    [revealedIds],
  )

  return (
    <div className="w-full" style={{ height: containerHeight }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#F4A23A" />
          </marker>
          <marker id="arrow-dim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.12)" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        panOnDrag={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        minZoom={0.4}
        maxZoom={2.0}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(244,245,247,0.035)" />
        <AutoFitView revealedCount={revealedIds.length} />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/flow/FlowCanvas.tsx
git commit -m "feat: auto-advance flow, dynamic canvas height, scroll-to-zoom"
```

- [ ] **Step 5: Push to trigger Railway deploy**

```bash
git push origin main
```

Expected: branch pushes cleanly. Railway auto-deploys on push (~2 min).
