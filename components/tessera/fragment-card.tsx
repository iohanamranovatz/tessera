"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type Character = "dmitri" | "ivan" | "alyosha" | "fyodor"

interface FragmentCardProps {
  id: string
  character: Character
  rotation: number
  position: { x: number; y: number }
  content: {
    type: "image" | "text" | "symbol"
    value: string
    label?: string
  }
  characterInfo?: {
    name: string
    aliases: string
    traits: string
  }
  zIndex?: number
}

const glowClasses: Record<Character, string> = {
  dmitri: "glow-dmitri",
  ivan: "glow-ivan",
  alyosha: "glow-alyosha",
  fyodor: "glow-fyodor",
}

export function FragmentCard({
  character,
  rotation,
  position,
  content,
  characterInfo,
  zIndex = 1,
}: FragmentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="absolute cursor-pointer transition-all duration-300 ease-out"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `rotate(${rotation}deg) ${isHovered ? "scale(1.08)" : "scale(1)"}`,
        zIndex: isHovered ? 100 : zIndex,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "polaroid w-28 h-32 sm:w-32 sm:h-36 md:w-36 md:h-40 transition-shadow duration-300",
          glowClasses[character]
        )}
      >
        <div className="w-full h-full bg-secondary flex items-center justify-center overflow-hidden">
          {content.type === "text" && (
            <div className="p-2 text-center">
              <p className="text-[10px] sm:text-xs text-foreground/90 italic leading-tight font-serif">
                {content.value}
              </p>
            </div>
          )}
          {content.type === "symbol" && (
            <div className="text-3xl sm:text-4xl text-primary/80">{content.value}</div>
          )}
          {content.type === "image" && (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              <span className="text-center px-2 italic">{content.label || content.value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {isHovered && characterInfo && (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-accent border border-border rounded shadow-xl z-50"
          style={{ top: "100%" }}
        >
          <p className="text-sm text-foreground font-semibold">{characterInfo.name}</p>
          <p className="text-xs text-muted-foreground italic mt-0.5">{characterInfo.aliases}</p>
          <p className="text-xs text-muted-foreground/80 mt-1">{characterInfo.traits}</p>
        </div>
      )}
    </div>
  )
}
