"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type RelationType = "all" | "family" | "love" | "conflict" | "mentor"

interface Character {
  id: string
  name: string
  subtitle?: string
  x: number
  y: number
  color: string
  isKaramazov: boolean
  isDashed?: boolean
  size?: number
}

interface Edge {
  from: string
  to: string
  type: RelationType
  label?: string
  isDashed?: boolean
  thickness?: number
}

const characters: Character[] = [
  { id: "fyodor", name: "Fyodor", subtitle: "tatăl", x: 35, y: 12, color: "#3a2820", isKaramazov: true },
  { id: "dmitri", name: "Mitya", subtitle: "Dmitri", x: 45, y: 45, color: "#8a3020", isKaramazov: true, size: 1.3 },
  { id: "ivan", name: "Ivan", subtitle: "Vanya", x: 75, y: 35, color: "#2a4a5a", isKaramazov: true },
  { id: "alyosha", name: "Alyosha", subtitle: "Alioșa", x: 22, y: 55, color: "#8a6a28", isKaramazov: true },
  { id: "smerdyakov", name: "Smerdyakov", x: 70, y: 70, color: "#5a4a3a", isKaramazov: false, isDashed: true },
  { id: "grushenka", name: "Grushenka", subtitle: "obiectul", x: 12, y: 38, color: "#8a4a5a", isKaramazov: false, isDashed: true },
  { id: "katerina", name: "Katerina", subtitle: "logodnica", x: 88, y: 50, color: "#8a4a5a", isKaramazov: false, isDashed: true },
  { id: "zosima", name: "Zosima", subtitle: "starețul †", x: 25, y: 82, color: "#6a6a3a", isKaramazov: false, isDashed: true },
]

const edges: Edge[] = [
  // Family connections (brown)
  { from: "fyodor", to: "dmitri", type: "family", thickness: 2 },
  { from: "fyodor", to: "ivan", type: "family", thickness: 2 },
  { from: "fyodor", to: "alyosha", type: "family", thickness: 2 },
  { from: "dmitri", to: "ivan", type: "family", thickness: 1.5 },
  { from: "dmitri", to: "alyosha", type: "family", thickness: 1.5 },
  { from: "ivan", to: "alyosha", type: "family", thickness: 1.5 },
  { from: "fyodor", to: "smerdyakov", type: "family", isDashed: true, thickness: 1 },
  
  // Love connections (pink)
  { from: "dmitri", to: "grushenka", type: "love", label: "obsession", thickness: 4 },
  { from: "dmitri", to: "katerina", type: "love", label: "engagement", thickness: 2 },
  { from: "fyodor", to: "grushenka", type: "love", thickness: 2, isDashed: true },
  { from: "ivan", to: "katerina", type: "love", thickness: 1.5, isDashed: true },
  
  // Conflict connections (red)
  { from: "fyodor", to: "dmitri", type: "conflict", label: "hatred", thickness: 3 },
  { from: "ivan", to: "smerdyakov", type: "conflict", thickness: 2, isDashed: true },
  
  // Mentor connections (olive)
  { from: "zosima", to: "alyosha", type: "mentor", thickness: 2 },
]

const filterColors: Record<RelationType, string> = {
  all: "#3a2818",
  family: "#5a4a3a",
  love: "#8a4a5a",
  conflict: "#8a3020",
  mentor: "#6a6a3a",
}

const edgeColors: Record<RelationType, string> = {
  all: "#5a4a3a",
  family: "#5a4a3a",
  love: "#8a4a5a",
  conflict: "#8a3020",
  mentor: "#6a6a3a",
}

function getNodeCenter(char: Character) {
  return { x: char.x, y: char.y }
}

function getCurvedPath(from: Character, to: Character, offset: number = 0) {
  const start = getNodeCenter(from)
  const end = getNodeCenter(to)
  
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  
  // Add curve offset perpendicular to the line
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  
  const perpX = -dy / len * (8 + offset * 3)
  const perpY = dx / len * (8 + offset * 3)
  
  const ctrlX = midX + perpX
  const ctrlY = midY + perpY
  
  return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`
}

export function RelationsGraph() {
  const [activeFilter, setActiveFilter] = useState<RelationType>("all")
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  
  const filters: { id: RelationType; label: string }[] = [
    { id: "all", label: "all" },
    { id: "family", label: "family" },
    { id: "love", label: "love" },
    { id: "conflict", label: "conflict" },
    { id: "mentor", label: "mentor" },
  ]
  
  const filteredEdges = edges.filter(edge => 
    activeFilter === "all" || edge.type === activeFilter
  )
  
  const hoveredChar = characters.find(c => c.id === hoveredNode)
  const hoveredStats = hoveredNode ? {
    love: edges.filter(e => (e.from === hoveredNode || e.to === hoveredNode) && e.type === "love").length,
    conflict: edges.filter(e => (e.from === hoveredNode || e.to === hoveredNode) && e.type === "conflict").length,
    family: edges.filter(e => (e.from === hoveredNode || e.to === hoveredNode) && e.type === "family").length,
  } : null

  return (
    <main className="flex-1 flex flex-col bg-card overflow-hidden">
      {/* Filter Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-serif rounded-full transition-all",
                activeFilter === filter.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/50"
              )}
            >
              {filter.id !== "all" && (
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: filterColors[filter.id] }}
                />
              )}
              {filter.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-serif italic hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted" />
            Karamazov
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-muted-foreground" />
            others
          </span>
        </span>
      </div>
      
      {/* Graph Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Chapter indicator */}
        <div className="absolute top-3 right-3 text-xs text-muted-foreground/60 font-serif italic z-10">
          ch. 8 / 12 — hidden after
        </div>
        
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ minHeight: "400px" }}
        >
          <defs>
            {/* Arrow marker for conflict lines */}
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#8a3020" />
            </marker>
            
            {/* Subtle noise filter for hand-drawn feel */}
            <filter id="roughen">
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            </filter>
          </defs>
          
          {/* Edges */}
          <g className="edges">
            {filteredEdges.map((edge, i) => {
              const fromChar = characters.find(c => c.id === edge.from)
              const toChar = characters.find(c => c.id === edge.to)
              if (!fromChar || !toChar) return null
              
              // Calculate offset for parallel edges
              const parallelEdges = filteredEdges.filter(
                e => (e.from === edge.from && e.to === edge.to) || 
                     (e.from === edge.to && e.to === edge.from)
              )
              const edgeIndex = parallelEdges.indexOf(edge)
              const offset = parallelEdges.length > 1 ? (edgeIndex - (parallelEdges.length - 1) / 2) * 2 : 0
              
              const path = getCurvedPath(fromChar, toChar, offset)
              const color = edgeColors[edge.type]
              const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to
              
              return (
                <g key={`${edge.from}-${edge.to}-${edge.type}-${i}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={edge.thickness || 1.5}
                    strokeDasharray={edge.isDashed ? "2,2" : undefined}
                    strokeLinecap="round"
                    opacity={isHighlighted ? 1 : 0.5}
                    markerEnd={edge.type === "conflict" ? "url(#arrowhead)" : undefined}
                    className="transition-opacity duration-200"
                    style={{ filter: "url(#roughen)" }}
                  />
                  {edge.label && (
                    <text
                      x={(fromChar.x + toChar.x) / 2 + (offset * 1.5)}
                      y={(fromChar.y + toChar.y) / 2 - 2}
                      fill={color}
                      fontSize="2.5"
                      fontStyle="italic"
                      textAnchor="middle"
                      opacity={isHighlighted ? 1 : 0.6}
                      className="font-serif transition-opacity duration-200"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
          
          {/* Nodes */}
          <g className="nodes">
            {characters.map((char) => {
              const size = (char.size || 1) * 4
              const isHovered = hoveredNode === char.id
              
              return (
                <g
                  key={char.id}
                  transform={`translate(${char.x}, ${char.y})`}
                  onMouseEnter={() => setHoveredNode(char.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {/* Node circle */}
                  <circle
                    r={size}
                    fill={char.isKaramazov ? char.color : "transparent"}
                    stroke={char.color}
                    strokeWidth={char.isDashed ? 0.3 : 0.5}
                    strokeDasharray={char.isDashed ? "1,0.5" : undefined}
                    className="transition-transform duration-200"
                    style={{ 
                      transform: isHovered ? "scale(1.15)" : "scale(1)",
                      transformOrigin: "center",
                    }}
                  />
                  
                  {/* Glow effect on hover */}
                  {isHovered && (
                    <circle
                      r={size + 2}
                      fill="none"
                      stroke={char.color}
                      strokeWidth={0.5}
                      opacity={0.4}
                    />
                  )}
                  
                  {/* Character name */}
                  <text
                    y={size + 3}
                    fill="#e8dcc4"
                    fontSize="3"
                    fontStyle="italic"
                    textAnchor="middle"
                    className="font-serif pointer-events-none"
                  >
                    {char.name}
                  </text>
                  
                  {/* Subtitle */}
                  {char.subtitle && (
                    <text
                      y={size + 6}
                      fill="#8a7656"
                      fontSize="2"
                      textAnchor="middle"
                      className="font-serif pointer-events-none"
                    >
                      {char.subtitle}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
        
        {/* Tooltip */}
        {hoveredChar && hoveredStats && (
          <div 
            className="absolute bg-accent/95 backdrop-blur-sm border border-border rounded px-3 py-2 pointer-events-none z-20"
            style={{
              left: `${hoveredChar.x}%`,
              top: `${hoveredChar.y}%`,
              transform: "translate(20px, -50%)",
            }}
          >
            <p className="text-sm text-foreground font-serif">
              <span className="italic">{hoveredChar.name}</span>
              {hoveredChar.subtitle && (
                <span className="text-muted-foreground"> ({hoveredChar.subtitle})</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hoveredStats.love > 0 && <span className="mr-2">{hoveredStats.love} love</span>}
              {hoveredStats.conflict > 0 && <span className="mr-2">{hoveredStats.conflict} conflict</span>}
              {hoveredStats.family > 0 && <span>{hoveredStats.family} family</span>}
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground/60 font-serif text-center">
          filled nodes = Karamazov · outline nodes = others · dashed line = secret or hypothetical · apply filters above to isolate a relationship type
        </p>
      </div>
    </main>
  )
}
