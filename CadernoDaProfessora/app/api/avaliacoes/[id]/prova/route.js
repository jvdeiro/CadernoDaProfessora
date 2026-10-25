import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { carregarAvaliacao } from '@/lib/avaliacao';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sb = await createClient();
  const dados = await carregarAvaliacao(sb, id);
  if (!dados) return NextResponse.json({ erro: 'Avaliação não encontrada.' }, { status: 404 });
  const { av, ctx, conteudos } = dados;
  if (!conteudos.some(c => c.resumo_md)) return NextResponse.json({ erro: 'Escolha pelo menos um conteúdo com o resumo pronto.' }, { status: 400 });
  if (!body.ajuste && !body.corrigir) {
    // Retoma o que já foi escrito; só "fazer do zero" apaga.
    await sb.from('avaliacoes').update({ processando: 'prova', gerando_em: null, pausa_ate: null, ultimo_erro: null, ...(body.zero || av.geracao?.modo ? { geracao: null } : {}) }).eq('id', id);
    return NextResponse.json({ enfileirado: true });
  }
  // Corrigir e "pedir uma mudança": o robô reescreve SÓ os itens afetados, um por chamada.
  // (Antes iam numa chamada única com a apostila inteira — a mesma que travava.)
  if (!av.prova) return NextResponse.json({ erro: 'Ainda não há prova para ajustar.' }, { status: 400 });
  const modo = body.corrigir ? { modo: 'corrigir' } : { modo: 'ajuste', pedido: String(body.ajuste).slice(0, 2000) };
  await sb.from('avaliacoes').update({ processando: 'prova', gerando_em: null, pausa_ate: null, ultimo_erro: null, geracao: { tipo: 'prova', ...modo } }).eq('id', id);
  return NextResponse.json({ enfileirado: true });
}
