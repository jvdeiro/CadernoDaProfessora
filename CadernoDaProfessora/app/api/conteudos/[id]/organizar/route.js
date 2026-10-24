// Organização manual do resumo (o caminho normal é o robô da fila, em /api/fila).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { organizarConteudo } from '@/lib/leitura';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  try {
    const r = await organizarConteudo(sb, id, { prazo: Date.now() + 150000 });
    if (r.pendente) return NextResponse.json({ erro: `Parte ${r.feitas} de ${r.total} pronta. Continuando…`, esperar: true }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: e.message, esperar: !!e.temporario }, { status: e.temporario ? 503 : 500 });
  }
}
