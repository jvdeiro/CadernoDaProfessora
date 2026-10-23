'use client';
import { createBrowserClient } from '@supabase/ssr';
let c;
export function createClient() {
  if (!c) c = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return c;
}
