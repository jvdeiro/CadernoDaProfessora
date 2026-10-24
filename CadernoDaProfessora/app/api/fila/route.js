// Robô da fila: chamado pelo agendador do banco (pg_cron) a cada 30 segundos.
// Lê UMA foto por vez no sistema todo, respira entre uma e outra, espera quando as IAs estão no limite
// e, quando todas as fotos de uma apostila terminam, organiza o resumo e avisa no celular.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lerPagina, organizarConteudo } from '@/lib/leitura';
import { avisar } from '@/lib/push';
import { gerarProvaEtapas, gerarRevisoesEtapas } from '@/lib/geracao';
import { carregarAvaliacao } from '@/lib/avaliacao';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const RESPIRO_MS = 8000;        // pausa entre uma foto e outra
const PAUSA_SEM_IA_S = 90;      // quando nenhuma IA está livre, a apostila descansa um pouco
const dormir = ms => new Promise(r => setTimeout(r, ms));
const daqui = s => new Date(Date.now() + s * 1000).toISOString();

export async function POST(req) {
  const inicio = Date.now();
  const segredo = req.headers.get('x-segredo');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: cred } = await sb.rpc('credencial_robo', { segredo });
  if (!cred) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  const { error: eLogin } = await sb.auth.signInWithPassword({ email: cred.email, password: cred.senha });
  if (eLogin) return NextResponse.json({ erro: 'login do robô falhou' }, { status: 500 });

  const feitos = [];
  // 1) Fotos: uma por vez, enquanto houver tempo nesta rodada
  while (Date.now() - inicio < 60000) {
    const { data: pegou } = await sb.rpc('pegar_pagina');
    const pg = pegou?.[0];
    if (!pg) break;
    try {
      const r = await lerPagina(sb, pg.id);
      feitos.push(`foto ${r.numero || pg.id}: ${r.status}`);
    } catch (e) {
      feitos.push(`foto ${pg.id}: ${e.message}`);
      await sb.from('conteudos').update({ ultimo_erro: `leitura: ${e.message}`.slice(0, 900), ...(e.temporario ? { pausa_ate: daqui(PAUSA_SEM_IA_S) } : {}) }).eq('id', pg.conteudo_id);
      if (e.temporario) break;
    }
    await dormir(RESPIRO_MS);
  }

  // 2) Apostilas com todas as fotos lidas: organizar o resumo e avisar
  if (Date.now() - inicio < 120000) {
    const { data: ativos } = await sb.from('conteudos').select('id,titulo,pausa_ate,organizando_em').eq('processando', true);
    for (const c of ativos || []) {
      if (c.pausa_ate && new Date(c.pausa_ate) > new Date()) continue;
      const { count } = await sb.from('paginas').select('id', { count: 'exact', head: true }).eq('conteudo_id', c.id).in('status', ['enviada', 'lendo']);
      if (count) continue;
      // trava para não organizar duas vezes ao mesmo tempo
      const limite = new Date(Date.now() - 6 * 60000).toISOString();
      const { data: travou } = await sb.from('conteudos').update({ organizando_em: new Date().toISOString() })
        .eq('id', c.id).or(`organizando_em.is.null,organizando_em.lt.${limite}`).select('id');
      if (!travou?.length) continue;
      try {
        const r = await organizarConteudo(sb, c.id, { prazo: inicio + 250000 });
        if (r.pendente) { // tempo da rodada acabou: as partes prontas ficaram salvas, a próxima rodada continua
          await sb.from('conteudos').update({ organizando_em: null }).eq('id', c.id);
          feitos.push(`organizando ${c.titulo}: parte ${r.feitas} de ${r.total}`);
          break;
        }
        await sb.from('conteudos').update({ processando: false, organizando_em: null, pausa_ate: null, ultimo_erro: null }).eq('id', c.id);
        const { count: comErro } = await sb.from('paginas').select('id', { count: 'exact', head: true }).eq('conteudo_id', c.id).eq('status', 'erro');
        await avisar(sb, {
          titulo: 'Apostila pronta! 📒',
          corpo: `${c.titulo}: o resumo está pronto${comErro ? ` (${comErro} ${comErro === 1 ? 'foto precisa' : 'fotos precisam'} ser enviada de novo)` : ''}. Já dá para criar a prova.`,
          url: `/conteudos/${c.id}`,
        }, { vapidPrivada: cred.vapid_privada, vapidPublica: cred.vapid_publica });
        feitos.push(`organizou ${c.titulo}`);
      } catch (e) {
        // Libera a trava de qualquer jeito: trava pendurada faz a apostila parar por 6 minutos.
        await sb.from('conteudos').update({ organizando_em: null, ultimo_erro: `organizar: ${e.message}`.slice(0, 900), ...(e.temporario ? { pausa_ate: daqui(PAUSA_SEM_IA_S) } : { processando: false }) }).eq('id', c.id);
        feitos.push(`organizar ${c.titulo}: ${e.message}`);
      }
      break; // uma organização por rodada
    }
  }
  // 3) Avaliações: prova e revisões também saem em etapas, retomando de onde pararam
  if (Date.now() - inicio < 200000) {
    const { data: avs } = await sb.from('avaliacoes').select('id,nome,processando,pausa_ate,gerando_em').not('processando', 'is', null);
    for (const a of avs || []) {
      if (a.pausa_ate && new Date(a.pausa_ate) > new Date()) continue;
      const limite = new Date(Date.now() - 6 * 60000).toISOString();
      const { data: travou } = await sb.from('avaliacoes').update({ gerando_em: new Date().toISOString() })
        .eq('id', a.id).or(`gerando_em.is.null,gerando_em.lt.${limite}`).select('id');
      if (!travou?.length) continue;
      try {
        const d = await carregarAvaliacao(sb, a.id);
        if (!d) throw new Error('avaliação sumiu');
        const fn = a.processando === 'revisoes' ? gerarRevisoesEtapas : gerarProvaEtapas;
        const r = await fn(sb, a.id, { ...d, prazo: inicio + 270000 });
        if (r.pendente) {
          await sb.from('avaliacoes').update({ gerando_em: null }).eq('id', a.id);
          feitos.push(`${a.processando} ${a.nome}: ${r.etapa} ${r.feitas || 0}/${r.total ?? '?'}`);
          break;
        }
        await sb.from('avaliacoes').update({ processando: null, gerando_em: null, pausa_ate: null, ultimo_erro: null }).eq('id', a.id);
        await avisar(sb, {
          titulo: a.processando === 'revisoes' ? 'Revisões prontas! 📝' : 'Prova pronta! ✏️',
          corpo: `${a.nome}: ${a.processando === 'revisoes' ? 'as 8 fichas estão prontas' : 'a prova e o gabarito estão prontos'}. Dá para conferir e imprimir.`,
          url: `/avaliacoes/${a.id}`,
        }, { vapidPrivada: cred.vapid_privada, vapidPublica: cred.vapid_publica });
        feitos.push(`${a.processando} ${a.nome}: pronto`);
      } catch (e) {
        await sb.from('avaliacoes').update({ gerando_em: null, ultimo_erro: `${a.processando}: ${e.message}`.slice(0, 900), ...(e.temporario ? { pausa_ate: daqui(PAUSA_SEM_IA_S) } : { processando: null }) }).eq('id', a.id);
        feitos.push(`${a.processando} ${a.nome}: ${e.message}`);
      }
      break; // uma avaliação por rodada
    }
  }

  return NextResponse.json({ ok: true, feitos, ms: Date.now() - inicio });
}
