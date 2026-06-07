/**
 * Supabase browser client.
 *
 * Reads the project URL + anon (public) key from environment variables.
 * The anon key is safe to expose in the browser — access is controlled by
 * Row Level Security (RLS) policies on the database, not by hiding the key.
 *
 * Fill the values in `.env.local` (see that file for where to find them).
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see the file for details).",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
