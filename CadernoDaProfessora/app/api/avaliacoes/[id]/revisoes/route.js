import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gerarRevisoes } from '@/lib/ia';
import { checarRevisoes, termosProibidos } from '@/lib/checagens';
import { carregarAvaliacao } from '@/lib/avaliacao';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sb = await createClient();
  const dados = await carregarAvaliacao(sb, id);
  if (!dados) return NextResponse.json({ erro: 'Avaliação não encontrada.' }, { status: 404 });
  const { av, ctx } = dados;
  if (!av.prova) return NextResponse.json({ erro: 'Crie a prova primeiro.' }, { status: 400 });
  if (!body.ajuste && !body.corrigir) {
    // Criar do zero: vai para o robô do servidor, que escreve em etapas e salva cada uma.
    // Retoma o que já foi escrito; só "fazer do zero" apaga. Antes, mandar criar de novo apagava
    // tudo — e a própria mensagem de erro dizia que ele continuaria de onde parou.
    await sb.from('avaliacoes').update({ processando: 'revisoes', gerando_em: null, pausa_ate: null, ultimo_erro: null, ...(body.zero ? { geracao: null } : {}) }).eq('id', id);
    return NextResponse.json({ enfileirado: true });
  }
  let ajuste = body.ajuste;
  if (body.corrigir && av.checagens?.revisoes?.problemas?.length) ajuste = 'A conferência automática achou coisas da prova nas revisões. Troque SÓ estas perguntas por outros fatos do mesmo assunto, sem usar nenhum termo proibido:\n- ' + av.checagens.revisoes.problemas.join('\n- ');
  const atual = ajuste && av.revisoes ? av.revisoes : null;
  try {
    const proibidos = termosProibidos(av.prova);
    const rev = await gerarRevisoes(ctx, { prova: av.prova, proibidos, ...(atual ? { atual, ajuste } : {}) });
    rev.comando = rev.comando || 'Responda em seu caderno:';
    const ch = checarRevisoes(rev, av.prova);
    const checagens = { ...(av.checagens || {}), revisoes: { ok: ch.ok, problemas: ch.problemas }, revisoes_desatualizadas: false };
    await sb.from('avaliacoes').update({ revisoes: rev, checagens, status: 'revisoes_prontas', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: ch.ok, problemas: ch.problemas });
  } catch (e) {
    return NextResponse.json({ erro: e.message, esperar: !!e.temporario }, { status: e.temporario ? 503 : 500 });
  }
}
