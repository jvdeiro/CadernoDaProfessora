// O service worker busca aqui o texto da última notificação.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data } = await sb.from('avisos').select('titulo,corpo,url').order('criado_em', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json(data || { titulo: 'Caderno da Professora', corpo: 'Tem novidade no seu caderno.', url: '/' });
}
