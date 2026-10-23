import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(req) {
  const sb = await createClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/login', req.url), 303);
}
