"use client"

import { useCallback, useMemo, useState } from "react"
import {
  ReactFlow, Background, BackgroundVariant,
  type Node, type Edge,
  useNodesState, useEdgesState,
} from "@xyflow/react"
import dagre from "dagre"
import "@xyflow/react/dist/style.css"
import type { FlowSchema, FlowNode, FlowEdge } from "@/types/flow"
import FlowStepNode from "./FlowStepNode"
import FlowDecisionNode from "./FlowDecisionNode"
import FlowOutcomeNode from "./FlowOutcomeNode"
import FlowAnimatedEdge from "./FlowAnimatedEdge"

// Node dimensions used for Dagre layout
const NODE_W: Record<string, number> = { step: 180, decision: 140, outcome: 180 }
const NODE_H: Record<string, number> = { step: 80, decision: 70, outcome: 70 }

function computeLayout(
  schemaNodes: FlowNode[],
  schemaEdges: FlowEdge[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  schemaNodes.forEach(n => {
    g.setNode(n.id, {
      width: NODE_W[n.type] ?? 180,
      height: NODE_H[n.type] ?? 80,
    })
  })
  schemaEdges.forEach(e => g.setEdge(e.from, e.to))
  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  schemaNodes.forEach(n => {
    const pos = g.node(n.id)
    positions.set(n.id, {
      x: pos.x - (NODE_W[n.type] ?? 180) / 2,
      y: pos.y - (NODE_H[n.type] ?? 80) / 2,
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

export default function FlowCanvas({ schema }: { schema: FlowSchema }) {
  const entryId = useMemo(
    () => findEntryNode(schema.nodes, schema.edges),
    [schema],
  )
  const positions = useMemo(
    () => computeLayout(schema.nodes, schema.edges),
    [schema],
  )

  // revealedIds: ordered list of revealed node IDs (entry first)
  const [revealedIds, setRevealedIds] = useState<string[]>([entryId])
  // revealedEdgeKeys: Set of "from->to" strings for revealed edges
  const [revealedEdgeKeys, setRevealedEdgeKeys] = useState<Set<string>>(new Set())

  const currentTip = revealedIds[revealedIds.length - 1] ?? entryId

  // Outgoing edges from current tip node
  const pendingEdges = useMemo(
    () => schema.edges.filter(e => e.from === currentTip && !revealedEdgeKeys.has(`${e.from}->${e.to}`)),
    [schema.edges, currentTip, revealedEdgeKeys],
  )

  function revealNext(edge: FlowEdge) {
    setRevealedIds(prev => [...prev, edge.to])
    setRevealedEdgeKeys(prev => new Set([...prev, `${edge.from}->${edge.to}`]))
  }

  function collapseToNode(nodeId: string) {
    const idx = revealedIds.indexOf(nodeId)
    if (idx === -1) return
    const keptIds = revealedIds.slice(0, idx + 1)
    const keptSet = new Set(keptIds)
    setRevealedIds(keptIds)
    setRevealedEdgeKeys(prev => {
      const next = new Set<string>()
      for (const key of prev) {
        const [from] = key.split("->")
        if (keptSet.has(from)) next.add(key)
      }
      return next
    })
  }

  const nodes: Node[] = schema.nodes
    .filter(n => revealedIds.includes(n.id) || pendingEdges.some(e => e.to === n.id))
    .map(n => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 }
      const isRevealed = revealedIds.includes(n.id)
      const isActive = revealedIds.includes(n.id)
      const isTip = n.id === currentTip
      return {
        id: n.id,
        type: n.type,
        position: pos,
        hidden: !isRevealed,
        data: {
          label: n.label,
          description: n.description,
          active: isActive,
          isCurrentTip: isTip,
        },
        draggable: false,
      }
    })

  const edges: Edge[] = schema.edges.map(e => {
    const edgeKey = `${e.from}->${e.to}`
    const isRevealed = revealedEdgeKeys.has(edgeKey)
    const isPending = e.from === currentTip && !isRevealed && revealedIds.includes(e.from)
    return {
      id: edgeKey,
      source: e.from,
      target: e.to,
      type: "flowAnimated",
      hidden: !isRevealed && !isPending,
      data: {
        label: e.label,
        active: isRevealed,
        pending: isPending,
        onChoose: isPending ? () => revealNext(e) : undefined,
      },
    }
  })

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const idx = revealedIds.indexOf(node.id)
      if (idx !== -1 && idx < revealedIds.length - 1) {
        collapseToNode(node.id)
      }
    },
    [revealedIds], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const [, , onNodesChange] = useNodesState(nodes)
  const [, , onEdgesChange] = useEdgesState(edges)

  // Sync external state changes into React Flow
  const syncedNodes = nodes
  const syncedEdges = edges

  return (
    <div className="w-full" style={{ height: 320 }}>
      {/* SVG defs for arrowheads */}
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
        nodes={syncedNodes}
        edges={syncedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(244,245,247,0.035)" />
      </ReactFlow>
    </div>
  )
}
