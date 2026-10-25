// Criação da prova e das revisões EM ETAPAS, com cada etapa salva no banco.
// Motivo: uma chamada só mandava os 78 mil caracteres do resumo e pedia 20 mil tokens de volta —
// as IAs gratuitas estouravam o tempo e tudo se perdia. Agora é um plano leve e lotes pequenos,
// cada um recebendo só o trecho de que precisa e ficando salvo assim que fica pronto.
import { planejarProva, escreverQuestoes, planejarRevisoes, escreverFichas, escolherItens, definirPrazo } from './ia.js';
import { checarProva, checarRevisoes, termosProibidos } from './checagens.js';

const POR_LOTE = 1;          // UMA questão (ou ficha) por chamada: as IAs gratuitas estouram o tempo
                             // com pedidos maiores. Mais chamadas, cada uma rápida e que quase sempre passa.
const MAX_TENTATIVAS = 3;    // um lote teimoso não trava a avaliação inteira
const RESPIRO_MS = 5000;     // pausa entre uma chamada e outra, para não estourar o limite por minuto
const dormir = ms => new Promise(r => setTimeout(r, ms));
// Tamanho do material. No modo de teste (avaliacoes.teste) é bem menor, para validar o caminho
// inteiro gastando o mínimo de IA: 3 questões e 2 fichas em vez de 10 e 8.
export const tamanho = av => (av?.teste ? { questoes: 3, fichas: 2 } : { questoes: 10, fichas: 8 });
const n = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0]) : null; };
const pts = s => parseFloat(String(s ?? '').replace(',', '.')) || 0;
const fmt = v => v.toFixed(1).replace('.', ',');

// "1,2 · 0,3 cada": refeito a partir dos pontos, para nunca contradizer a soma.
export function pontuacaoDe(q) {
  const n = (q.itens || []).length || (q.palavras || []).length;
  const v = pts(q.pontos);
  if (n < 2) return fmt(v);
  const cada = Math.round((v / n) * 100) / 100;
  return `${fmt(v)} · ${String(cada.toFixed(2)).replace('.', ',').replace(/0$/, '')} cada`;
}

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
    const tops = (c.info?.topicos || []).map(t => `  · ${String(t.titulo).replace(/^\d+\s+/, '')} — páginas: ${t.paginas || 'sem número'}`).join('\n');
    return `### ${c.titulo}\n${tops || '  (sem tópicos mapeados)'}`;
  }).join('\n\n');
}

// Só as páginas pedidas. Sem páginas reconhecidas, cai num trecho do começo para não ficar sem contexto.
const palavras = s => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g) || []);
// "15-19" e "15–17" viram todas as páginas do intervalo (até 15 páginas), não só as pontas.
const numeros = s => {
  const out = new Set();
  for (const m of String(s || '').matchAll(/(\d+)(?:\s*[-–a]\s*(\d+))?/g)) {
    const de = +m[1], ate = m[2] ? +m[2] : de;
    if (ate >= de && ate - de <= 15) for (let n = de; n <= ate; n++) out.add(n); else out.add(de);
  }
  return out;
};

// Páginas do tópico do mapa que mais combina com o assunto pedido.
function paginasDoAssunto(conteudos, assunto) {
  const alvo = palavras(assunto);
  let melhor = null, pontos = 0;
  for (const t of conteudos.flatMap(c => c.info?.topicos || [])) {
    const n = [...palavras(t.titulo)].filter(w => alvo.has(w)).length;
    if (n > pontos && t.paginas) { melhor = t.paginas; pontos = n; }
  }
  return melhor;
}

// Só as páginas daquela questão. Antes: o mapa de tópicos nem chegava ao plano, toda questão caía
// nas "primeiras páginas" e o corte de 3.500 caracteres deixava só a página 52 — a prova inteira
// saiu de uma página. Agora, sem página reconhecida, usa as do tópico do assunto.
export function trechoDe(conteudos, paginas, assunto) {
  const todas = conteudos.flatMap(c => fatiarResumo(c.resumo_md));
  const existe = new Set(todas.map(p => p.numero));
  let quer = new Set([...numeros(paginas)].filter(n => existe.has(n)));
  if (!quer.size && assunto) quer = new Set([...numeros(paginasDoAssunto(conteudos, assunto))].filter(n => existe.has(n)));
  const escolhidas = quer.size ? todas.filter(p => quer.has(p.numero)) : todas.slice(0, 4);
  return escolhidas.map(p => p.texto).join('\n\n').slice(0, 9000);
}

// Linhas do anexo ("pontos a conferir" / "não cobrar") das páginas pedidas. O anexo é uma tabela
// markdown cuja primeira coluna é a página. Sem isto, a prova cobrava justamente os erros da
// apostila (ex.: "Retirada da Laguna = maior combate campal", marcado como NÃO COBRAR).
export function anexoDe(conteudos, paginas, assunto) {
  const quer = numeros(paginas);
  if (!quer.size && assunto) for (const n of numeros(paginasDoAssunto(conteudos, assunto))) quer.add(n);
  if (!quer.size) return '';
  const bate = (de, ate) => { for (let n = de; n <= ate; n++) if (quer.has(n)) return true; return false; };
  const linhas = [];
  for (const c of conteudos) {
    let bloco = false;   // dentro de um bloco "**p. 38**" cujas páginas interessam
    for (const l of String(c.anexo_erros_md || '').split('\n')) {
      const t = l.trim();
      // formato tabela: | 31 | ... |   ou   | 15-17 | ... |
      const tab = t.match(/^\|\s*(?:dig\.|fís\.|p\.)?\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\|/i);
      if (tab) { bloco = false; if (bate(+tab[1], tab[2] ? +tab[2] : +tab[1])) linhas.push(t); continue; }
      // formato bloco: "**p. 38**", "**p. 24** – título", "- Página 64: ..."
      const cab = t.match(/^(?:\*\*|-\s*)?(?:p\.|Página|página)\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
      if (cab) { bloco = bate(+cab[1], cab[2] ? +cab[2] : +cab[1]); if (bloco) linhas.push(t); continue; }
      if (/^(#|---|\|)/.test(t) || t === '') { if (t.startsWith('#') || t.startsWith('---')) bloco = false; continue; }
      if (bloco) linhas.push(t);
    }
  }
  return linhas.join('\n').slice(0, 4000);
}

const lotes = (arr, tam) => Array.from({ length: Math.ceil(arr.length / tam) }, (_, i) => arr.slice(i * tam, i * tam + tam));

// Roda as etapas que faltam, salvando cada uma. Devolve { pronto } ou { pendente, feitas, total, etapa }.
async function emEtapas(sb, id, { prazo, chave, estado, itens, planejar, escrever, fechar }) {
  const salvar = async extra => {
    const feitas = (estado.lotes || []).filter(Boolean).length;
    await sb.from('avaliacoes').update({ geracao: { ...estado, feitas, chave }, ...extra }).eq('id', id);
    return feitas;
  };
  // Conta a tentativa no item travado. Vale tanto para a falha direta quanto para a rodada que
  // acabou sem conseguir nada: sem isso, um item que sempre estoura o tempo fica pendente para
  // sempre e o limite de tentativas nunca dispara (já aconteceu: 1 hora no mesmo lote).
  // Atenção: o plano tem contador próprio. Um índice negativo num array some ao virar JSON,
  // então a tentativa do plano nunca ficava salva e ele podia repetir para sempre.
  const contarTentativa = async i => {
    let n;
    if (i < 0) { n = (estado.tentativasPlano || 0) + 1; estado.tentativasPlano = n; }
    else { estado.tentativas = Object.assign([], estado.tentativas || [], { [i]: ((estado.tentativas || [])[i] || 0) + 1 }); n = estado.tentativas[i]; }
    const desistir = n >= MAX_TENTATIVAS;
    if (desistir && i >= 0) estado.lotes[i] = [];   // segue sem este item
    await salvar();
    return desistir;
  };
  const prazoAnterior = definirPrazo(prazo);
  try {
    if (!estado.plano) {
      const desistiuDoPlano = async () => {
        const e = new Error('Não consegui montar o plano depois de várias tentativas. As IAs gratuitas estão fora do ar; tente de novo daqui a pouco.');
        e.temporario = false; // para de tentar e avisa, em vez de repetir para sempre
        throw e;
      };
      if (Date.now() > prazo - 15000) {
        if (await contarTentativa(-1)) await desistiuDoPlano();
        return { pendente: true, feitas: 0, total: null, etapa: 'plano' };
      }
      try { estado.plano = await planejar(); }
      catch (e) { if (await contarTentativa(-1)) await desistiuDoPlano(); throw e; }
      estado.lotes = [];
      estado.tentativas = [];
      estado.tentativasPlano = 0;
      await salvar();
    }
    const grupos = lotes(itens(estado.plano), POR_LOTE);
    estado.total = grupos.length;
    let fezAlgo = false;
    for (let i = 0; i < grupos.length; i++) {
      if (estado.lotes[i]) continue;
      if (Date.now() > prazo - 15000) {
        if (!fezAlgo) await contarTentativa(i);   // rodada inteira sem conseguir nada
        return { pendente: true, feitas: await salvar(), total: grupos.length, etapa: 'lote' };
      }
      try {
        if (fezAlgo) await dormir(RESPIRO_MS);   // respira entre uma chamada e a próxima
        estado.lotes[i] = await escrever(grupos[i], estado.lotes.flat().filter(Boolean));
        fezAlgo = true;
      } catch (e) {
        const desistiu = await contarTentativa(i);
        if (desistiu) continue;                   // segue sem este lote
        if (e.semTempo) return { pendente: true, feitas: await salvar(), total: grupos.length, etapa: 'lote' };
        throw e;
      }
    }
    // Nunca entregar material pela metade: melhor avisar e guardar o que deu certo.
    const vazios = estado.lotes.filter(l => Array.isArray(l) && !l.length).length;
    if (vazios > grupos.length / 3) {
      // devolve os lotes que falharam para a fila, para que uma nova tentativa recomece só por eles
      estado.lotes = estado.lotes.map(l => (Array.isArray(l) && !l.length ? undefined : l));
      estado.tentativas = [];
      await salvar();
      const e = new Error(`Consegui escrever só ${grupos.length - vazios} de ${grupos.length} partes: as IAs gratuitas estão no limite. O que ficou pronto está guardado — é só mandar criar de novo daqui a pouco que ele continua de onde parou.`);
      e.temporario = false;
      throw e;
    }
    await fechar(estado.lotes.flat().filter(Boolean), estado.plano);
    return { pronto: true, total: grupos.length };
  } finally { definirPrazo(prazoAnterior); }
}

export async function gerarProvaEtapas(sb, id, { av, ctx, conteudos, prazo = Date.now() + 240000 }) {
  if (av.geracao?.modo) return retocarEtapas(sb, id, { av, ctx, conteudos, prazo, tipo: 'prova' });
  const { questoes: quantas } = tamanho(av);
  // POR_LOTE entra na chave: se o tamanho do lote mudar, o progresso salvo não serve mais
  // (os índices passariam a apontar para outras questões, gerando duplicatas).
  const chave = `prova:${POR_LOTE}:${quantas}:${conteudos.map(c => c.id).join(',')}:${av.pedidos || ''}`;
  const g = av.geracao?.chave === chave && av.geracao?.tipo === 'prova' ? av.geracao : { tipo: 'prova', lotes: [] };
  const estado = { ...g, tipo: 'prova', lotes: g.lotes || [] };
  const mapa = mapaAssuntos(conteudos);
  return emEtapas(sb, id, {
    prazo, chave, estado,
    itens: plano => ajustarPontos((plano.questoes || []).slice(0, quantas)).map((q, i) => ({ ...q, n: i + 1 })),
    planejar: () => planejarProva(ctx, { mapa, quantas }),
    escrever: async (lote, jaFeitas) => {
      const pags = lote.map(q => q.paginas).join(' '), assunto = lote.map(q => q.assunto).join(' ');
      const r = await escreverQuestoes(ctx, { plano: estado.plano, lote, jaFeitas, trecho: trechoDe(conteudos, pags, assunto), ressalvas: anexoDe(conteudos, pags, assunto) });
      // uma questão por lote, marcada com o número do plano (para a pontuação casar mesmo se algum lote faltar)
      return (r.questoes || []).slice(0, 1).map(q => ({ ...q, n: lote[0].n }));
    },
    fechar: async (questoesBrutas, plano) => {
      const doPlano = ajustarPontos((plano.questoes || []).slice(0, quantas));
      const questoes = ajustarPontos(questoesBrutas.map(q => ({ ...q, pontos: doPlano[(q.n || 0) - 1]?.pontos || q.pontos })))
        .map(q => ({ ...q, pontuacao: pontuacaoDe(q) }));
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
  if (av.geracao?.modo) return retocarEtapas(sb, id, { av, ctx, conteudos, prazo, tipo: 'revisoes' });
  const { fichas: quantas } = tamanho(av);
  const chave = `revisoes:${POR_LOTE}:${quantas}:${JSON.stringify(av.prova?.resumo_questoes || []).length}`;
  const g = av.geracao?.chave === chave && av.geracao?.tipo === 'revisoes' ? av.geracao : { tipo: 'revisoes', lotes: [] };
  const estado = { ...g, tipo: 'revisoes', lotes: g.lotes || [] };
  const mapa = mapaAssuntos(conteudos);
  const proibidos = termosProibidos(av.prova);
  return emEtapas(sb, id, {
    prazo, chave, estado,
    itens: plano => (plano.fichas || []).slice(0, quantas),
    planejar: () => planejarRevisoes(ctx, { mapa, prova: av.prova, proibidos, quantas }),
    escrever: async (lote, jaFeitas) => {
      const r = await escreverFichas(ctx, {
        lote, proibidos, trecho: trechoDe(conteudos, lote.map(f => f.paginas).join(' '), lote.map(f => f.tema).join(' ')),
        ressalvas: anexoDe(conteudos, lote.map(f => f.paginas).join(' '), lote.map(f => f.tema).join(' ')),
        jaFeitas: jaFeitas.flatMap(f => (f.perguntas || []).map(p => p.texto)),
      });
      return (r.fichas || []).slice(0, 1);
    },
    fechar: async (fichas, plano) => {
      const rev = { comando: plano.comando || 'Responda em seu caderno:', fichas };
      const ch = checarRevisoes(rev, av.prova, quantas);
      await sb.from('avaliacoes').update({
        revisoes: rev, geracao: null,
        checagens: { ...(av.checagens || {}), revisoes: { ok: ch.ok, problemas: ch.problemas }, revisoes_desatualizadas: false },
        status: 'revisoes_prontas', updated_at: new Date().toISOString(),
      }).eq('id', id);
    },
  });
}

// ---------- retoque: corrigir ou "pedir uma mudança" sem refazer tudo ----------
// Antes, os dois botões mandavam a apostila inteira e pediam a prova toda reescrita numa chamada só
// (o mesmo pedido gigante que travava). Agora: descobre QUAIS itens mudar e reescreve só esses,
// um por chamada, vendo os demais itens para não repetir nem entregar respostas.
const nums = (txt, palavra) => [...String(txt).matchAll(new RegExp(`${palavra} (\\d+)`, 'gi'))].map(m => +m[1]);

function alvosDaCorrecao(problemas, palavra) {
  // "A resposta X da questão 3 aparece escrita na questão 5": reescreve a 3 (troca a resposta dela).
  // "Ficha 2, pergunta b: usa termo da prova": reescreve a ficha 2.
  const alvos = new Set();
  for (const p of problemas || []) { const n = nums(p, palavra)[0]; if (n) alvos.add(n); }
  return [...alvos].sort((a, b) => a - b).slice(0, 4);   // no máximo 4 por correção
}

async function retocarEtapas(sb, id, { av, ctx, conteudos, prazo, tipo }) {
  const ehProva = tipo === 'prova';
  const atual = ehProva ? av.prova : av.revisoes;
  const lista = ehProva ? atual.questoes : atual.fichas;
  const g = av.geracao;
  const estado = { ...g, lotes: g.lotes || [] };
  const chave = g.chave || `retoque:${tipo}:${g.modo}:${Date.now()}`;
  const proibidos = ehProva ? [] : termosProibidos(av.prova);
  const curto = (x, i) => ehProva ? `${i + 1}. [${x.tipo}] ${x.enunciado} — respostas: ${(x.respostas_chave || []).join(', ')}`
                                  : `${i + 1}. ${x.tema}: ${(x.perguntas || []).map(p => p.texto).join(' / ')}`;
  return emEtapas(sb, id, {
    prazo, chave, estado,
    itens: plano => plano.alvos || [],
    planejar: async () => {
      if (g.modo === 'corrigir') {
        const probs = (av.checagens?.[tipo]?.problemas) || [];
        return { alvos: alvosDaCorrecao(probs, ehProva ? 'questão' : 'Ficha').map(n => ({ n, instrucao: probs.filter(p => nums(p, ehProva ? 'questão' : 'Ficha')[0] === n).join(' ') })) };
      }
      // "pedir uma mudança": uma chamada minúscula diz quais itens mudar
      const r = await escolherItens({ pedido: g.pedido, lista: lista.map(curto).join('\n'), oQue: ehProva ? 'questões' : 'fichas de revisão' });
      return { alvos: [...new Set((r.numeros || []).filter(n => n >= 1 && n <= lista.length))].slice(0, 6).map(n => ({ n, instrucao: `${g.pedido}\n(${r.instrucao || ''})` })) };
    },
    escrever: async (lote) => {
      const alvo = lote[0];
      const novos = estado.lotes.flat().filter(Boolean);
      // os outros itens como estão AGORA (já com o que foi reescrito nesta mesma correção)
      const atuais = lista.map((x, i) => novos.find(nv => nv.n === i + 1) || x);
      const outros = atuais.filter((_, i) => i + 1 !== alvo.n);
      const velho = lista[alvo.n - 1];
      if (ehProva) {
        const r = await escreverQuestoes(ctx, {
          plano: { questoes: lista }, jaFeitas: outros,
          lote: [{ n: alvo.n, tipo: velho.tipo, assunto: velho.enunciado, pontos: velho.pontos }],
          trecho: trechoDe(conteudos, (velho.gabarito || []).join(' ') + ' ' + (alvo.instrucao.match(/p(?:ágina|ág|ag)?s?\.?\s*\d+(?:\s*(?:[-–]|a)\s*\d+)?/gi) || []).join(' '), velho.enunciado),
          ressalvas: anexoDe(conteudos, (velho.gabarito || []).join(' ') + ' ' + (alvo.instrucao.match(/p(?:ágina|ág|ag)?s?\.?\s*\d+(?:\s*(?:[-–]|a)\s*\d+)?/gi) || []).join(' '), velho.enunciado),
          instrucao: `Reescreva a questão ${alvo.n}. Motivo: ${alvo.instrucao}`,
        });
        return (r.questoes || []).slice(0, 1).map(q => ({ ...q, n: alvo.n, pontos: velho.pontos }));
      }
      // Páginas: as da ficha antiga + as que o pedido citar ("troque a ficha 4 por uma sobre a abolição, p. 26-28").
      // Sem isso o pedido de trocar o tema vinha sem o conteúdo do tema novo.
      const pagsFicha = (velho.perguntas || []).map(p => p.resposta).join(' ') + ' ' + (alvo.instrucao.match(/p(?:ágina|ág|ag)?s?\.?\s*\d+(?:\s*(?:[-–]|a)\s*\d+)?/gi) || []).join(' ');
      const r = await escreverFichas(ctx, {
        lote: [{ tema: velho.tema }], proibidos,
        trecho: trechoDe(conteudos, pagsFicha, velho.tema),
        ressalvas: anexoDe(conteudos, pagsFicha, velho.tema),
        jaFeitas: outros.flatMap(f => (f.perguntas || []).map(p => p.texto)),
        instrucao: `Reescreva esta ficha. Motivo: ${alvo.instrucao}`,
      });
      return (r.fichas || []).slice(0, 1).map(f => ({ ...f, n: alvo.n }));
    },
    fechar: async (novos) => {
      const trocado = lista.map((x, i) => { const nv = novos.find(n => n.n === i + 1); if (!nv) return x; const { n, ...resto } = nv; return resto; });
      if (ehProva) {
        const questoes = ajustarPontos(trocado).map(q => ({ ...q, pontuacao: pontuacaoDe(q) }));
        const prova = { ...atual, questoes, resumo_questoes: questoes.map(q => `[${q.tipo}] ${q.enunciado}`) };
        const ch = checarProva(prova);
        await sb.from('avaliacoes').update({
          prova, termos_proibidos: termosProibidos(prova), geracao: null,
          checagens: { ...(av.checagens || {}), prova: ch, revisoes_desatualizadas: !!av.revisoes }, updated_at: new Date().toISOString(),
        }).eq('id', id);
      } else {
        const rev = { ...atual, fichas: trocado };
        const ch = checarRevisoes(rev, av.prova, tamanho(av).fichas);
        await sb.from('avaliacoes').update({
          revisoes: rev, geracao: null,
          checagens: { ...(av.checagens || {}), revisoes: { ok: ch.ok, problemas: ch.problemas } }, updated_at: new Date().toISOString(),
        }).eq('id', id);
      }
    },
  });
}
