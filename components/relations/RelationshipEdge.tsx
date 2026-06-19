"use client"

/**
 * RelationshipEdge — a custom React Flow edge for one relationship.
 *
 * Encodes three things visually:
 *  - COLOUR  → relationship type (family / love / conflict / mentor)
 *  - WIDTH   → strength (1 = faint, 3 = central)
 *  - DASHES  → secret/hypothetical links are drawn dashed
 *
 * On hover it shows a small tooltip with the relationship's label + description,
 * positioned at the middle of the curve via <EdgeLabelRenderer>.
 */

import { useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react"
import type { RelationshipType } from "@/types"

/** Shape of the data we attach to each relationship edge. */
export interface RelationshipEdgeData {
  type: RelationshipType
  strength: 1 | 2 | 3
  label?: string
  description?: string
  isSecret?: boolean
  /** Dimmed when another node is hovered and this edge isn't connected to it. */
  faded?: boolean
  [key: string]: unknown
}

/** Accent colour per relationship type (dark-academia palette). */
export const EDGE_COLORS: Record<RelationshipType, string> = {
  family: "#5a4a3a",
  love: "#8a4a5a",
  conflict: "#8a3020",
  mentor: "#6a6a3a",
}

/** strength 1/2/3 → line width in pixels. */
const STRENGTH_WIDTH: Record<1 | 2 | 3, number> = {
  1: 1.5,
  2: 3,
  3: 5,
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const d = (data ?? {}) as RelationshipEdgeData
  const [hovered, setHovered] = useState(false)

  // Bezier gives us the SVG path AND the curve's midpoint (for the tooltip).
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const color = EDGE_COLORS[d.type] ?? "#5a4a3a"
  const width = STRENGTH_WIDTH[d.strength] ?? 2

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: width,
          strokeDasharray: d.isSecret ? "6 4" : undefined,
          strokeLinecap: "round",
          opacity: d.faded ? 0.12 : hovered ? 1 : 0.6,
          transition: "opacity 200ms",
        }}
      />

      {/* A wide, invisible "hit area" over the path so hovering the thin line
          is easy. It carries the hover handlers. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        style={{ pointerEvents: d.faded ? "none" : "stroke", cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        {/* Always-visible short label sitting on the curve */}
        {d.label && !hovered && !d.faded && (
          <div
            className="pointer-events-none absolute font-serif text-[11px] italic"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color,
            }}
          >
            {d.label}
          </div>
        )}

        {/* Hover tooltip with the full description */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-50 max-w-56 rounded border border-border bg-popover px-3 py-2 shadow-xl"
            style={{
              transform: `translate(-50%, -110%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <p className="font-serif text-sm italic" style={{ color }}>
              {d.label ?? d.type}
            </p>
            {d.description && (
              <p className="mt-1 font-serif text-xs leading-snug text-muted-foreground">
                {d.description}
              </p>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
