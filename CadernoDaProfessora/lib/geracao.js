// Criação da prova e das revisões EM ETAPAS, com cada etapa salva no banco.
// Motivo: uma chamada só mandava os 78 mil caracteres do resumo e pedia 20 mil tokens de volta —
// as IAs gratuitas estouravam o tempo e tudo se perdia. Agora é um plano leve e lotes pequenos,
// cada um recebendo só o trecho de que precisa e ficando salvo assim que fica pronto.
import { planejarProva, escreverQuestoes, planejarRevisoes, escreverFichas, definirPrazo } from './ia.js';
import { checarProva, checarRevisoes, termosProibidos } from './checagens.js';

const POR_LOTE = 2;          // questões (ou fichas) escritas por chamada
const MAX_TENTATIVAS = 3;    // um lote teimoso não trava a avaliação inteira
const n = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0]) : null; };
const pts = s => parseFloat(String(s ?? '').replace(',', '.')) || 0;
const fmt = v => v.toFixed(1).replace('.', ',');

// A soma TEM que dar 10,0. Se o plano errar por pouco, acerta no código em vez de gastar
// uma chamada de IA só para corrigir aritmética.
export function ajustarPontos(questoes) {
  const qs = questoes.map(q => ({ ...q, pontos: fmt(Math.max(0.2, Math.round(pts(q.pontos) * 10) / 10)) }));
  if (!qs.length) return qs;
  const soma = qs.reduce((a, q) => a + pts(q.pontos), 0);
  const falta = Math.round((10 - soma) * 10) / 10;
  if (!falta) return qs;
  // distribui a diferença de 0,1 em 0,1, começando pelas questões que valem mais
  const ordem = qs.map((q, i) => i).sort((a, b) => pts(qs[b].pontos) - pts(qs[a].pontos));
  let resta = Math.round(falta * 10);
  for (let k = 0; resta !== 0; k = (k + 1) % ordem.length) {
    const i = ordem[k], atual = pts(qs[i].pontos);
    const passo = resta > 0 ? 0.1 : -0.1;
    if (atual + passo < 0.2) continue;
    qs[i].pontos = fmt(Math.round((atual + passo) * 10) / 10);
    resta -= resta > 0 ? 1 : -1;
  }
  return qs;
}

// Quebra o resumo salvo de volta em páginas, usando as marcas "**[p. N · ...]**".
export function fatiarResumo(md) {
  const partes = String(md || '').split(/\n\n(?=\*\*\[p\. )/);
  return partes.filter(Boolean).map(t => ({ numero: n((t.match(/\*\*\[p\. ([^\]·]*)/) || [])[1]), texto: t }));
}

// Mapa de assuntos (leve) que o plano recebe no lugar do resumo inteiro.
export function mapaAssuntos(conteudos) {
  return conteudos.map(c => {
    const tops = (c.info?.topicos || []).map(t => `  · ${t.titulo}${t.paginas ? ` (p. ${t.paginas})` : ''}`).join('\n');
    return `### ${c.titulo}\n${tops || '  (sem tópicos mapeados)'}`;
  }).join('\n\n');
}

// Só as páginas pedidas. Sem páginas reconhecidas, cai num trecho do começo para não ficar sem contexto.
export function trechoDe(conteudos, paginas) {
  const quer = new Set(String(paginas || '').match(/\d+/g)?.map(Number) || []);
  const todas = conteudos.flatMap(c => fatiarResumo(c.resumo_md));
  const escolhidas = quer.size ? todas.filter(p => quer.has(p.numero)) : [];
  const usar = escolhidas.length ? escolhidas : todas.slice(0, 6);
  return usar.map(p => p.texto).join('\n\n').slice(0, 24000);
}

const lotes = (arr, tam) => Array.from({ length: Math.ceil(arr.length / tam) }, (_, i) => arr.slice(i * tam, i * tam + tam));

// Roda as etapas que faltam, salvando cada uma. Devolve { pronto } ou { pendente, feitas, total, etapa }.
async function emEtapas(sb, id, { prazo, chave, estado, itens, planejar, escrever, fechar }) {
  const salvar = async extra => {
    const feitas = (estado.lotes || []).filter(Boolean).length;
    await sb.from('avaliacoes').update({ geracao: { ...estado, feitas, chave }, ...extra }).eq('id', id);
    return feitas;
  };
  definirPrazo(prazo);
  try {
    if (!estado.plano) {
      if (Date.now() > prazo - 15000) return { pendente: true, feitas: 0, total: null, etapa: 'plano' };
      estado.plano = await planejar();
      estado.lotes = [];
      await salvar();
    }
    const grupos = lotes(itens(estado.plano), POR_LOTE);
    estado.total = grupos.length;
    for (let i = 0; i < grupos.length; i++) {
      if (estado.lotes[i]) continue;
      if (Date.now() > prazo - 15000) return { pendente: true, feitas: await salvar(), total: grupos.length, etapa: 'lote' };
      try {
        estado.lotes[i] = await escrever(grupos[i], estado.lotes.flat().filter(Boolean));
      } catch (e) {
        if (e.semTempo) return { pendente: true, feitas: await salvar(), total: grupos.length, etapa: 'lote' };
        estado.tentativas = Object.assign([], estado.tentativas || [], { [i]: ((estado.tentativas || [])[i] || 0) + 1 });
        await salvar();
        if (estado.tentativas[i] < MAX_TENTATIVAS) throw e;
        estado.lotes[i] = [];   // segue sem este lote; o fechamento ajusta o que depender dele
        await salvar();
      }
    }
    await fechar(estado.lotes.flat().filter(Boolean), estado.plano);
    return { pronto: true, total: grupos.length };
  } finally { definirPrazo(0); }
}

export async function gerarProvaEtapas(sb, id, { av, ctx, conteudos, prazo = Date.now() + 240000 }) {
  const chave = `prova:${conteudos.map(c => c.id).join(',')}:${av.pedidos || ''}`;
  const g = av.geracao?.chave === chave && av.geracao?.tipo === 'prova' ? av.geracao : { tipo: 'prova', lotes: [] };
  const estado = { ...g, tipo: 'prova', lotes: g.lotes || [] };
  const mapa = mapaAssuntos(conteudos);
  return emEtapas(sb, id, {
    prazo, chave, estado,
    itens: plano => ajustarPontos(plano.questoes || []).map((q, i) => ({ ...q, n: i + 1 })),
    planejar: () => planejarProva(ctx, { mapa }),
    escrever: async (lote, jaFeitas) => {
      const r = await escreverQuestoes(ctx, { plano: estado.plano, lote, jaFeitas, trecho: trechoDe(conteudos, lote.map(q => q.paginas).join(' ')) });
      return r.questoes || [];
    },
    fechar: async (questoes, plano) => {
      const prova = {
        titulo: `${av.nome} de ${ctx.materia} – ${ctx.turma}`, abertura: plano.abertura, questoes,
        termos_proibidos: [], fora_da_prova: '',
        resumo_questoes: questoes.map(q => `[${q.tipo}] ${q.enunciado}`),
      };
      const ch = checarProva(prova);
      await sb.from('avaliacoes').update({
        prova, termos_proibidos: termosProibidos(prova), geracao: null,
        checagens: { ...(av.checagens || {}), prova: ch, revisoes_desatualizadas: !!av.revisoes },
        status: av.revisoes ? 'revisoes_prontas' : 'prova_pronta', updated_at: new Date().toISOString(),
      }).eq('id', id);
    },
  });
}

export async function gerarRevisoesEtapas(sb, id, { av, ctx, conteudos, prazo = Date.now() + 240000 }) {
  const chave = `revisoes:${JSON.stringify(av.prova?.resumo_questoes || []).length}`;
  const g = av.geracao?.chave === chave && av.geracao?.tipo === 'revisoes' ? av.geracao : { tipo: 'revisoes', lotes: [] };
  const estado = { ...g, tipo: 'revisoes', lotes: g.lotes || [] };
  const mapa = mapaAssuntos(conteudos);
  const proibidos = termosProibidos(av.prova);
  return emEtapas(sb, id, {
    prazo, chave, estado,
    itens: plano => plano.fichas || [],
    planejar: () => planejarRevisoes(ctx, { mapa, prova: av.prova, proibidos }),
    escrever: async (lote, jaFeitas) => {
      const r = await escreverFichas(ctx, {
        lote, proibidos, trecho: trechoDe(conteudos, lote.map(f => f.paginas).join(' ')),
        jaFeitas: jaFeitas.flatMap(f => (f.perguntas || []).map(p => p.texto)),
      });
      return r.fichas || [];
    },
    fechar: async (fichas, plano) => {
      const rev = { comando: plano.comando || 'Responda em seu caderno:', fichas };
      const ch = checarRevisoes(rev, av.prova);
      await sb.from('avaliacoes').update({
        revisoes: rev, geracao: null,
        checagens: { ...(av.checagens || {}), revisoes: { ok: ch.ok, problemas: ch.problemas }, revisoes_desatualizadas: false },
        status: 'revisoes_prontas', updated_at: new Date().toISOString(),
      }).eq('id', id);
    },
  });
}
