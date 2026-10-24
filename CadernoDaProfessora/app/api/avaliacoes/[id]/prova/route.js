import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gerarProva } from '@/lib/ia';
import { checarProva, termosProibidos } from '@/lib/checagens';
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
  let ajuste = body.ajuste;
  if (body.corrigir && av.checagens?.prova?.problemas?.length) ajuste = 'Corrija estes problemas encontrados na conferência automática (mude só o necessário):\n- ' + av.checagens.prova.problemas.join('\n- ');
  const atual = ajuste && av.prova ? av.prova : null;
  try {
    const prova = await gerarProva(ctx, atual ? { atual, ajuste } : {});
    prova.titulo = `${av.nome} de ${ctx.materia} – ${ctx.turma}`;
    const ch = checarProva(prova);
    const checagens = { ...(av.checagens || {}), prova: ch, revisoes_desatualizadas: !!av.revisoes };
    await sb.from('avaliacoes').update({
      prova, termos_proibidos: termosProibidos(prova), checagens,
      status: av.revisoes ? 'revisoes_prontas' : 'prova_pronta', updated_at: new Date().toISOString(),
    }).eq('id', id);
    return NextResponse.json({ ok: ch.ok, problemas: ch.problemas, avisos: ch.avisos });
  } catch (e) {
    return NextResponse.json({ erro: e.message, esperar: !!e.temporario }, { status: e.temporario ? 503 : 500 });
  }
}
