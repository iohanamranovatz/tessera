"use client"

/**
 * FragmentContent — renders the inside of a fragment card based on its `type`.
 *
 * For now these are simple inline-SVG / text placeholders. At Stage 6 the
 * "object" and "place" types will be replaced by real images (Met Museum /
 * Wikimedia), but the component API stays the same.
 */

import type { Fragment } from "@/types"

interface FragmentContentProps {
  fragment: Fragment
  /** The owning character's accent colour, used to tint placeholders. */
  color: string
}

export function FragmentContent({ fragment, color }: FragmentContentProps) {
  switch (fragment.type) {
    // A short line of text, shown as a centred italic quote.
    case "quote":
      return (
        <div className="flex h-full w-full items-center justify-center p-3">
          <p className="text-center font-serif text-[10px] italic leading-tight text-foreground/90 sm:text-xs">
            {fragment.content}
          </p>
        </div>
      )

    // A pure symbol/glyph (e.g. "∞"), shown large.
    case "symbol":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-4xl" style={{ color }}>
            {fragment.content}
          </span>
        </div>
      )

    // A person — placeholder is a simple portrait circle in the character colour.
    case "human":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
            <circle cx="50" cy="38" r="18" fill={color} opacity="0.85" />
            <path d="M20 90 Q50 55 80 90 Z" fill={color} opacity="0.85" />
          </svg>
        </div>
      )

    // A place — placeholder is a small horizon/landscape glyph.
    case "place":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 100 60" className="h-2/5 w-3/5" aria-hidden>
            <path d="M5 50 L35 20 L55 40 L75 15 L95 50 Z" fill={color} opacity="0.8" />
            <line x1="0" y1="50" x2="100" y2="50" stroke={color} strokeWidth="2" />
          </svg>
          {fragment.label && (
            <span className="px-1 text-center font-serif text-[9px] italic text-muted-foreground">
              {fragment.label}
            </span>
          )}
        </div>
      )

    // An object — placeholder is a framed box with the label.
    case "object":
    default:
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <svg viewBox="0 0 100 100" className="h-2/5 w-2/5" aria-hidden>
            <rect x="20" y="20" width="60" height="60" rx="4" fill="none" stroke={color} strokeWidth="4" />
            <circle cx="50" cy="50" r="10" fill={color} opacity="0.8" />
          </svg>
          {fragment.label && (
            <span className="px-1 text-center font-serif text-[9px] italic text-muted-foreground">
              {fragment.label}
            </span>
          )}
        </div>
      )
  }
}
