import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { importarHistorico } from '@/lib/importar';

export const maxDuration = 120;

export async function POST(req) {
  const sb = await createClient();
  let r;
  try { r = await importarHistorico(sb); } catch (e) { r = 'erro: ' + e.message; }
  return NextResponse.redirect(new URL('/mais?importado=' + encodeURIComponent(r), req.url), 303);
}
