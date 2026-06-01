"use client"

import { Plus } from "lucide-react"
import { FragmentCard } from "./fragment-card"

type Character = "dmitri" | "ivan" | "alyosha" | "fyodor"

interface Fragment {
  id: string
  character: Character
  rotation: number
  position: { x: number; y: number }
  content: {
    type: "image" | "text" | "symbol"
    value: string
    label?: string
  }
  characterInfo: {
    name: string
    aliases: string
    traits: string
  }
}

const fragments: Fragment[] = [
  {
    id: "1",
    character: "dmitri",
    rotation: -5,
    position: { x: 5, y: 8 },
    content: { type: "image", value: "uniform", label: "Military Uniform" },
    characterInfo: {
      name: "Dmitri Karamazov",
      aliases: "Mitya, Mitka, Mitenka",
      traits: "passionate, military, unstable",
    },
  },
  {
    id: "2",
    character: "dmitri",
    rotation: 4,
    position: { x: 28, y: 5 },
    content: { type: "text", value: '"3000 rubles, Grushenka awaits"' },
    characterInfo: {
      name: "Dmitri Karamazov",
      aliases: "Mitya, Mitka, Mitenka",
      traits: "passionate, military, unstable",
    },
  },
  {
    id: "3",
    character: "ivan",
    rotation: -3,
    position: { x: 55, y: 10 },
    content: { type: "image", value: "candle", label: "Burning Candle" },
    characterInfo: {
      name: "Ivan Karamazov",
      aliases: "Vanya",
      traits: "rational, intellectual, tormented",
    },
  },
  {
    id: "4",
    character: "alyosha",
    rotation: 6,
    position: { x: 78, y: 5 },
    content: { type: "image", value: "icon", label: "Orthodox Icon" },
    characterInfo: {
      name: "Alexei Karamazov",
      aliases: "Alyosha, Alyoshka",
      traits: "spiritual, gentle, faithful",
    },
  },
  {
    id: "5",
    character: "alyosha",
    rotation: -7,
    position: { x: 8, y: 42 },
    content: { type: "image", value: "monastery", label: "Monastery Candles" },
    characterInfo: {
      name: "Alexei Karamazov",
      aliases: "Alyosha, Alyoshka",
      traits: "spiritual, gentle, faithful",
    },
  },
  {
    id: "6",
    character: "fyodor",
    rotation: 3,
    position: { x: 32, y: 38 },
    content: { type: "image", value: "cognac", label: "Bottle of Cognac" },
    characterInfo: {
      name: "Fyodor Karamazov",
      aliases: "Father",
      traits: "debauched, greedy, cruel",
    },
  },
  {
    id: "7",
    character: "ivan",
    rotation: -4,
    position: { x: 58, y: 42 },
    content: { type: "image", value: "eyes", label: "Watchful Eyes" },
    characterInfo: {
      name: "Ivan Karamazov",
      aliases: "Vanya",
      traits: "rational, intellectual, tormented",
    },
  },
  {
    id: "8",
    character: "dmitri",
    rotation: 8,
    position: { x: 75, y: 38 },
    content: { type: "image", value: "hands", label: "Clasped Hands" },
    characterInfo: {
      name: "Dmitri Karamazov",
      aliases: "Mitya, Mitka, Mitenka",
      traits: "passionate, military, unstable",
    },
  },
  {
    id: "9",
    character: "fyodor",
    rotation: -6,
    position: { x: 18, y: 68 },
    content: { type: "image", value: "coins", label: "Gold Coins" },
    characterInfo: {
      name: "Fyodor Karamazov",
      aliases: "Father",
      traits: "debauched, greedy, cruel",
    },
  },
  {
    id: "10",
    character: "ivan",
    rotation: 2,
    position: { x: 42, y: 65 },
    content: { type: "symbol", value: "∞" },
    characterInfo: {
      name: "Ivan Karamazov",
      aliases: "Vanya",
      traits: "rational, intellectual, tormented",
    },
  },
  {
    id: "11",
    character: "alyosha",
    rotation: -2,
    position: { x: 65, y: 68 },
    content: { type: "image", value: "cross", label: "Wooden Cross" },
    characterInfo: {
      name: "Alexei Karamazov",
      aliases: "Alyosha, Alyoshka",
      traits: "spiritual, gentle, faithful",
    },
  },
]

export function CollageBoard() {
  return (
    <main className="flex-1 relative bg-card dotted-texture overflow-hidden">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[12vw] font-serif italic text-foreground/[0.04] tracking-widest">
          братья
        </span>
      </div>

      {/* Fragment cards */}
      <div className="absolute inset-0">
        {fragments.map((fragment, index) => (
          <FragmentCard key={fragment.id} {...fragment} zIndex={index + 1} />
        ))}
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-xs text-muted-foreground/70 font-serif text-center">
          {fragments.length} fragments · hover for character details · drag to rearrange
        </p>
      </div>

      {/* FAB - Add new fragment */}
      <button
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Add new fragment"
      >
        <Plus className="w-5 h-5" />
      </button>
    </main>
  )
}
