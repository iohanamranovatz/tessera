import type { Fragment } from "@/types"

/**
 * Finds a spot on the board (in 0–100 percent coordinates) that is as far as
 * possible from existing fragments, so a newly added card doesn't land on top
 * of another one.
 *
 * Strategy: sample a number of random candidate points, and keep the one whose
 * nearest existing fragment is the furthest away (i.e. the emptiest area).
 */
export function findOptimalPosition(existing: Fragment[]): { x: number; y: number } {
  const MARGIN = 10 // keep away from the very edges
  const SAMPLES = 50

  // Nothing placed yet → just use the centre.
  if (existing.length === 0) {
    return { x: 50, y: 40 }
  }

  let best = { x: 50, y: 50 }
  let bestDistance = -1

  for (let i = 0; i < SAMPLES; i++) {
    const x = MARGIN + Math.random() * (100 - 2 * MARGIN)
    const y = MARGIN + Math.random() * (100 - 2 * MARGIN)

    // distance to the closest existing fragment
    let nearest = Infinity
    for (const f of existing) {
      const dx = f.position.x - x
      const dy = f.position.y - y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < nearest) nearest = d
    }

    if (nearest > bestDistance) {
      bestDistance = nearest
      best = { x, y }
    }
  }

  return best
}
