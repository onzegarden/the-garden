/**
 * Anonymous Supabase client — no session cookies, no auth context.
 * Use this for public pages (/share/[token]) where the visitor
 * is unauthenticated and RLS must be evaluated as the anon role.
 */
import { createClient } from "@supabase/supabase-js";

export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
