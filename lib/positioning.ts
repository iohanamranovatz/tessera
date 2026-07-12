/** Un punct pe board, în coordonate procentuale 0–100. */
export interface Point {
  x: number
  y: number
}

/**
 * Finds a spot on the board (in 0–100 percent coordinates) that is as far as
 * possible from existing fragments, so a newly added card doesn't land on top
 * of another one.
 *
 * Primește DIRECT pozițiile deja ocupate (nu obiecte `Fragment`), ca să poată fi
 * apelat și cu poziții acumulate din mai multe surse — de ex. imaginile generate
 * în fundal, câte un personaj o dată, care altfel s-ar îngrămădi toate în centru.
 *
 * Strategy: sample a number of random candidate points, and keep the one whose
 * nearest existing fragment is the furthest away (i.e. the emptiest area).
 */
export function findOptimalPosition(existing: Point[]): Point {
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
    for (const p of existing) {
      const dx = p.x - x
      const dy = p.y - y
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
