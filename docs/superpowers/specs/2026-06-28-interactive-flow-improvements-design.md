# Interactive Flow Improvements Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three problems with the interactive flow segment: layout overflow, requiring clicks on every node, and poor AI label quality.

**Scope:** All changes are to shared infrastructure (node components, FlowCanvas, AI prompts). Every product with an `interactive_flow` segment benefits automatically.

---

## 1. AI Prompt — Label Quality

### Labeling conventions

The `FLOW_MERMAID_SYSTEM_PROMPT` and `FLOW_SYSTEM_PROMPT` in `src/lib/flow-ai-prompt.ts` are rewritten with strict, example-backed labeling rules:

**Step nodes** — imperative verb phrase, user perspective, 2–4 words. Reads like a button label.
- ✅ "Book a Pickup", "Create Account", "Scan at Hub"
- ❌ "The user books a pickup", "Booking", "Account Creation Process"

**Decision nodes** — short natural-language question, 2–5 words. Concrete, not abstract. Sounds like a person asking.
- ✅ "Home or office?", "Monthly or one-off?", "Solo or team?"
- ❌ "Account Type" (too corporate/abstract), "Who are you?" (too personal/weird), "Which service?" (too generic)

**Edge labels (paths from decisions)** — 2–3 word self-contained descriptor. Must make sense read alone, away from the diamond.
- ✅ "Home pickup", "Office venue", "Monthly plan"
- ❌ "Home", "Business", "Yes", "Option A"

**Outcome nodes** — past-tense or noun result, 2–4 words.
- ✅ "Deposit credited", "Report delivered", "Balance updated"
- ❌ "Success", "Done", "The deposit has been credited to the user's account"

### Additional prompt rules
- Maximum 8 nodes, maximum 2 decision points. Consolidate — one node per phase, not per micro-action.
- Node `description` field: always populated for step and outcome nodes (1 sentence, ≤80 chars, plain language, no AI vocabulary: "leverage", "seamlessly", "robust", "cutting-edge"). Decision nodes may omit it — the edge labels carry the information.
- No `\n` in labels. Label and description are always separate fields.
- The Mermaid prompt must produce node labels that already follow these rules, since labels pass through directly to the schema.

### Schema prompt update
`FLOW_SCHEMA_SYSTEM_PROMPT` updated to always output the `description` field in the JSON (empty string if not applicable). The schema `action` in `generate-flow` route accepts `sessionId` alongside `mermaid`, loads the conversation context, and instructs Claude to generate descriptions from that context — the same pattern already used by the map and icon prompts. This avoids embedding non-standard syntax into Mermaid.

---

## 2. Node Visual Redesign

### Decision node
The rotated-square diamond is replaced with a rounded rectangle (same width as step nodes: 180px) with:
- A small split-arrow or fork glyph (e.g. `⌥`) in amber before the label, indicating branching
- Same border/background treatment as an active step node
- Text centered, no rotation
- Dagre height updated: 80px (from 70px)

Dropping the diamond removes the primary source of unreadable decision text. The fork glyph preserves the visual signal that this is a branching point.

### Text alignment and multiline support
All node types switch to **centered text**. The `\n` label hack is removed — label and description render as separate elements:
- `label`: `font-display text-sm font-semibold` centered
- `description`: `font-mono text-[10px] text-slate mt-1` centered, renders only when present

Dagre node heights:
- `step`: 90px (from 80px) to accommodate description line
- `decision`: 80px (from 70px)
- `outcome`: 70px (unchanged — outcomes rarely have descriptions)

### Node entrance animation
Changed from `scale: 0.92 → 1` to `y: 8 → 0` + `opacity: 0 → 1`, duration 400ms (from 250ms), ease `[0.22, 1, 0.36, 1]`. The upward drift reads as "settling into place" — more cinematic, less bouncy. Applied to all three node types.

---

## 3. Auto-advance State Machine

### Rule
**One pending edge → auto-advance after delay. Two or more pending edges → pause and wait for user choice.**

This applies regardless of node type. A `step` node with two outgoing edges pauses; a `decision` node with one outgoing edge auto-advances.

### Timing
```
ADVANCE_DELAY_MS = 800
```
Named constant in `FlowCanvas.tsx`. After the current tip node is revealed, a 800ms timeout fires `revealNext` on the single pending edge. The timeout is cancelled on cleanup (component unmount or collapse-and-re-branch).

Edge draw-in: 500ms (unchanged).  
Node entrance: 400ms (updated, see section 2).  
Total perceived time per auto-advance step: ~1.7s.

### Sequence
1. Mount → entry node revealed immediately, auto-advance timer starts if entry has one outgoing edge
2. Timer fires → `revealNext(edge)` → edge draws in (500ms) → target node drifts in (400ms) → new tip evaluated
3. If new tip has one pending edge → timer restarts
4. If new tip has multiple pending edges → NodeToolbar shows choice buttons, no timer
5. User clicks choice → `revealNext(edge)` → resume auto-advance from new tip
6. Outcome nodes are terminal (no outgoing edges) → no timer, sequence ends

### Collapse-and-re-branch
Clicking any previously-revealed node collapses the flow back to that point (existing behaviour). After collapse, the auto-advance timer restarts from the new tip — no manual intervention needed to resume.

---

## 4. Layout — Dynamic Height + Scroll-to-Zoom

### Container height
Replaced fixed `320px` with a computed height:

```
containerHeight = max(nodeY + nodeHeight) across ALL schema nodes + 80px vertical padding
```

Computed from `positions` (already calculated for all nodes via Dagre on mount). Set as inline style on the wrapper div. The canvas is always tall enough for the complete flow at natural scale — no shrinking.

### Zoom
```
zoomOnScroll={true}
zoomOnPinch={true}
minZoom={0.4}
maxZoom={2.0}
panOnDrag={false}  // unchanged
```

Pan remains disabled. Dynamic height eliminates vertical overflow; the flow is wide enough for horizontal content at natural scale. Users navigate by zooming, not panning.

### fitView
- Initial `fitView` with `padding: 0.25` frames the complete layout on load
- `AutoFitView` child component calls `fitView({ duration: 400, padding: 0.25 })` whenever `revealedIds.length` increases, keeping revealed nodes in frame as the flow grows
- User zoom overrides are not reset between reveals (React Flow preserves user zoom when `fitView` is called with duration — it animates to the new fit rather than snapping)

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/flow-ai-prompt.ts` | Rewrite `FLOW_SYSTEM_PROMPT`, `FLOW_MERMAID_SYSTEM_PROMPT`, `FLOW_SCHEMA_SYSTEM_PROMPT` with new labeling rules and description field |
| `src/app/api/ai/generate-flow/route.ts` | Pass `sessionId` to schema action; load conversation context; include in schema prompt |
| `src/types/flow.ts` | Ensure `description` is required (not optional) on `FlowNode` — empty string default |
| `src/components/flow/FlowCanvas.tsx` | Dynamic height, zoom props, `ADVANCE_DELAY_MS`, auto-advance `useEffect` |
| `src/components/flow/FlowStepNode.tsx` | Centered text, description rendering, updated entrance animation |
| `src/components/flow/FlowDecisionNode.tsx` | Replace diamond with rounded rect + fork glyph, centered text, description support, updated animation |
| `src/components/flow/FlowOutcomeNode.tsx` | Centered text, updated entrance animation |

No database migration needed. No API route changes. Existing stored `FlowSchema` data works as-is — `description` may be empty string for old flows, which renders nothing (handled by `{d.description && ...}` guard already present).
