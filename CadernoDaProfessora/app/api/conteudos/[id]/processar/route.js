// Põe a apostila na fila do robô: as fotos que faltam (ou deram erro) voltam para a fila e a leitura segue no servidor.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  const limite = new Date(Date.now() - 6 * 60000).toISOString();
  await sb.from('paginas').update({ status: 'enviada', erro: null }).eq('conteudo_id', id).eq('status', 'erro');
  await sb.from('paginas').update({ status: 'enviada' }).eq('conteudo_id', id).eq('status', 'lendo').lt('lendo_em', limite);
  const { error } = await sb.from('conteudos').update({ processando: true, pausa_ate: null, organizando_em: null }).eq('id', id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
