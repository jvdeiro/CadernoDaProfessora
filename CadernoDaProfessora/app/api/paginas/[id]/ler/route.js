// Leitura manual de uma foto (o caminho normal é o robô da fila, em /api/fila).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lerPagina } from '@/lib/leitura';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  await sb.from('paginas').update({ status: 'lendo', lendo_em: new Date().toISOString() }).eq('id', id);
  try {
    return NextResponse.json({ ok: true, ...(await lerPagina(sb, id)) });
  } catch (e) {
    return NextResponse.json({ erro: e.message, esperar: !!e.temporario }, { status: e.temporario ? 503 : 500 });
  }
}
