import { redirect } from "next/navigation"
import { BOOK_ID } from "@/data/karamazov"

/**
 * Root route. The real app now lives at /book/[bookId], so the homepage just
 * sends the reader to the default book's collage view.
 */
export default function Home() {
  redirect(`/book/${BOOK_ID}?tab=collage`)
}
