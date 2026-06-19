"use client"

/**
 * CharacterNode — a custom React Flow node for one character.
 *
 * Renders a coloured circle (filled for "main" characters, outlined for the
 * rest) with the character's name in serif italic underneath, matching the
 * dark-academia look of the old hand-built graph.
 *
 * React Flow passes everything we put in the node's `data` field here as
 * `props.data`. We also render <Handle> elements (the connection anchors edges
 * attach to); they are invisible but required for edges to render.
 */

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

/** Shape of the data we attach to each character node. */
export interface CharacterNodeData {
  label: string
  subtitle?: string
  color: string
  /** Filled circle when true (e.g. the Karamazov family), outline otherwise. */
  filled: boolean
  /** Drawn with a dashed outline (secondary / not-yet-central characters). */
  dashed?: boolean
  /** Relative size multiplier (1 = default). */
  size?: number
  /** Dimmed when another node is hovered and this one isn't connected. */
  faded?: boolean
  [key: string]: unknown
}

function CharacterNodeComponent({ data }: NodeProps) {
  const d = data as CharacterNodeData
  const diameter = 56 * (d.size ?? 1)

  return (
    <div
      className="flex flex-col items-center transition-opacity duration-200"
      style={{ opacity: d.faded ? 0.2 : 1 }}
    >
      {/* Connection anchors — invisible but needed by React Flow. We expose all
          four sides so edges can attach from any direction. */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />

      <div
        className="rounded-full transition-transform duration-200"
        style={{
          width: diameter,
          height: diameter,
          backgroundColor: d.filled ? d.color : "transparent",
          border: `2px ${d.dashed ? "dashed" : "solid"} ${d.color}`,
        }}
      />

      <span className="mt-1 font-serif text-sm italic text-foreground">{d.label}</span>
      {d.subtitle && (
        <span className="font-serif text-xs text-muted-foreground">{d.subtitle}</span>
      )}
    </div>
  )
}

// memo() avoids re-rendering every node when only one changes (React Flow tip).
export const CharacterNode = memo(CharacterNodeComponent)
