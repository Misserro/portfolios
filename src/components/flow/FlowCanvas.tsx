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
