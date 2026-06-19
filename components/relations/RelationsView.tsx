"use client"

/**
 * RelationsView — the "Relations" tab, powered by React Flow.
 *
 * Pipeline:
 *  1. load characters + relationships + book (for the current chapter)
 *  2. ANTI-SPOILER: drop relationships whose `revealedInChapter` is later than
 *     the reader's current chapter — they simply don't exist on the graph yet
 *  3. build React Flow nodes (positioned by a hand-tuned layout for Karamazov,
 *     or an automatic circular layout for any other / larger book)
 *  4. build React Flow edges, carrying type/strength/label/description so the
 *     custom <RelationshipEdge> can style itself
 *  5. a filter bar isolates one relationship type
 *  6. hovering a node fades every node/edge not connected to it
 */

import { useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { cn } from "@/lib/utils"
import { useBook, useCharacters, useRelationships } from "@/hooks/use-tessera-data"
import type { Character, Relationship, RelationshipType } from "@/types"
import { CharacterNode, type CharacterNodeData } from "./CharacterNode"
import { RelationshipEdge, EDGE_COLORS, type RelationshipEdgeData } from "./RelationshipEdge"

interface RelationsViewProps {
  bookId: string
}

type FilterType = "all" | RelationshipType

/** Register our custom node/edge types once (outside the component). */
const nodeTypes = { character: CharacterNode }
const edgeTypes = { relationship: RelationshipEdge }

/**
 * Hand-tuned layout for *The Brothers Karamazov*, keyed by character id.
 * Coordinates are in React Flow pixels. The four brothers/father are the
 * "filled" family nodes; everyone else is an outlined satellite.
 */
const KARAMAZOV_LAYOUT: Record<
  string,
  { x: number; y: number; filled: boolean; dashed?: boolean; size?: number; subtitle?: string }
> = {
  "char-fyodor": { x: 360, y: 40, filled: true, subtitle: "tatăl" },
  "char-dmitri": { x: 380, y: 280, filled: true, size: 1.25, subtitle: "Mitya" },
  "char-ivan": { x: 660, y: 200, filled: true, subtitle: "Vanya" },
  "char-alyosha": { x: 150, y: 320, filled: true, subtitle: "Alioșa" },
  "char-smerdyakov": { x: 640, y: 470, filled: false, dashed: true },
  "char-grushenka": { x: 60, y: 200, filled: false, dashed: true, subtitle: "obiectul" },
  "char-katerina": { x: 780, y: 360, filled: false, dashed: true, subtitle: "logodnica" },
  "char-zosima": { x: 200, y: 540, filled: false, dashed: true, subtitle: "starețul †" },
}

/** Above this many characters we stop hand-placing and lay them out in a circle. */
const MANUAL_LAYOUT_LIMIT = 10

/** Deterministic circular layout — used for any book without a hand-tuned map. */
function circularLayout(characters: Character[]): Record<string, { x: number; y: number }> {
  const radius = 60 + characters.length * 28
  const cx = radius + 80
  const cy = radius + 80
  const positions: Record<string, { x: number; y: number }> = {}
  characters.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / characters.length
    positions[c.id] = {
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
    }
  })
  return positions
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "all" },
  { id: "family", label: "family" },
  { id: "love", label: "love" },
  { id: "conflict", label: "conflict" },
  { id: "mentor", label: "mentor" },
]

export function RelationsView({ bookId }: RelationsViewProps) {
  const { data: book } = useBook(bookId)
  const { data: characters, loading: charsLoading } = useCharacters(bookId)
  const { data: relationships, loading: relsLoading } = useRelationships(bookId)

  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  const currentChapter = book?.currentChapter ?? Infinity
  const loading = charsLoading || relsLoading

  // --- 1. anti-spoiler + type filter on relationships -----------------------
  const visibleRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      // Hide secret links the reader hasn't reached yet.
      if (rel.revealedInChapter != null && rel.revealedInChapter > currentChapter) {
        return false
      }
      // Apply the active type filter.
      if (activeFilter !== "all" && rel.type !== activeFilter) return false
      return true
    })
  }, [relationships, currentChapter, activeFilter])

  // --- 2. build the BASE nodes/edges (no hover state baked in) --------------
  // Hover fading is applied later by flipping a `faded` flag on these, so the
  // arrays stay stable and React Flow keeps its node measurements (no jitter).
  const useManualLayout = characters.length <= MANUAL_LAYOUT_LIMIT
  const fallbackPositions = useMemo(() => circularLayout(characters), [characters])

  const baseNodes: Node<CharacterNodeData>[] = useMemo(() => {
    return characters.map((char) => {
      const manual = KARAMAZOV_LAYOUT[char.id]
      const pos =
        useManualLayout && manual
          ? { x: manual.x, y: manual.y }
          : fallbackPositions[char.id] ?? { x: 0, y: 0 }

      return {
        id: char.id,
        type: "character",
        position: pos,
        data: {
          label: char.nicknames[0] ?? char.name.split(" ")[0],
          subtitle: manual?.subtitle ?? char.name.split(" ")[0],
          color: char.color,
          filled: manual?.filled ?? true,
          dashed: manual?.dashed,
          size: manual?.size,
          faded: false,
        },
      }
    })
  }, [characters, useManualLayout, fallbackPositions])

  const baseEdges: Edge<RelationshipEdgeData>[] = useMemo(() => {
    return visibleRelationships.map((rel) => {
      const color = EDGE_COLORS[rel.type]

      return {
        id: rel.id,
        source: rel.fromCharacterId,
        target: rel.toCharacterId,
        type: "relationship",
        // Conflict links get an arrowhead to read as directional aggression.
        markerEnd:
          rel.type === "conflict"
            ? { type: MarkerType.ArrowClosed, color, width: 18, height: 18 }
            : undefined,
        data: {
          type: rel.type,
          strength: rel.strength,
          label: rel.label,
          description: rel.description,
          isSecret: rel.isSecret,
          faded: false,
        },
      }
    })
  }, [visibleRelationships])

  // --- 3. hold them in React Flow state -------------------------------------
  // useNodesState/useEdgesState give us the onChange handlers React Flow needs
  // to store its own measurements — the missing piece that caused the trembling.
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges)

  // Re-seed the state only when the underlying data/filter changes (not on hover).
  useEffect(() => setNodes(baseNodes), [baseNodes, setNodes])
  useEffect(() => setEdges(baseEdges), [baseEdges, setEdges])

  // --- 4. hover fading: flip `faded` on existing items, in place ------------
  function fadeToNode(nodeId: string) {
    const connected = new Set<string>([nodeId])
    for (const rel of visibleRelationships) {
      if (rel.fromCharacterId === nodeId) connected.add(rel.toCharacterId)
      if (rel.toCharacterId === nodeId) connected.add(rel.fromCharacterId)
    }
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, faded: !connected.has(n.id) } })),
    )
    setEdges((es) =>
      es.map((e) => ({
        ...e,
        data: {
          ...(e.data as RelationshipEdgeData),
          faded: !(e.source === nodeId || e.target === nodeId),
        },
      })),
    )
  }

  function clearFade() {
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, faded: false } })))
    setEdges((es) =>
      es.map((e) => ({ ...e, data: { ...(e.data as RelationshipEdgeData), faded: false } })),
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      {/* Filter bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-serif text-xs transition-all",
                activeFilter === f.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground/80",
              )}
            >
              {f.id !== "all" && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: EDGE_COLORS[f.id as RelationshipType] }}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
        <span className="hidden font-serif text-xs italic text-muted-foreground sm:block">
          ch. {book?.currentChapter ?? "—"} / {book?.totalChapters ?? "—"} — hidden after
        </span>
      </div>

      {/* Graph canvas */}
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="animate-pulse font-serif italic text-muted-foreground">
              se încarcă relațiile…
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeMouseEnter={(_, node) => fadeToNode(node.id)}
            onNodeMouseLeave={clearFade}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            className="[&_.react-flow__background]:opacity-40"
          >
            {/* Dotted paper-like background */}
            <Background gap={16} size={1} color="rgba(138, 118, 86, 0.25)" />
            <Controls showInteractive={false} className="!border-border" />
          </ReactFlow>
        )}
      </div>

      {/* Footer legend */}
      <div className="border-t border-border/30 px-4 py-3 sm:px-6">
        <p className="text-center font-serif text-xs text-muted-foreground/60">
          noduri pline = familia Karamazov · noduri conturate = ceilalți · linie punctată = relație
          secretă · treci cu mouse-ul peste un nod pentru a izola legăturile lui
        </p>
      </div>
    </main>
  )
}
