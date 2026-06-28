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
