// Chamadas à IA com saída estruturada — só modelos abertos (open-weight) em faixas gratuitas.
// Ordem de tentativa (a próxima entra sozinha quando uma atinge o limite ou falha):
//   Fotos:  Gemma 4 pela API do Google (GEMINI_API_KEY) → Gemma 4 / Nemotron VL pelo OpenRouter (OPENROUTER_API_KEY)
//   Textos: Gemma 4 31B / Nemotron 3 Ultra pelo OpenRouter → Gemma 4 pelo Google
//   (MISTRAL_API_KEY entra na frente se existir — o plano Free da Mistral não libera API hoje.)
import { REGRAS_TRANSCRICAO, REGRAS_ANEXO, REGRAS_PROVA, REGRAS_QUESTAO, regrasQuestaoDe, REGRAS_REVISOES, REGRAS_AJUSTE } from './regras.js';

export class ErroIA extends Error {}
class Pular extends Error {} // falha que justifica tentar o próximo provedor

const lista = (v, padrao) => (v || padrao).split(',').map(x => x.trim()).filter(Boolean);

function provedores(comImagem, grande) {
  const mistral = [], google = [], openrouter = [];
  if (process.env.MISTRAL_API_KEY) for (const m of lista(process.env.MODELOS_MISTRAL, 'mistral-large-latest'))
    mistral.push({ nome: `Mistral ${m}`, tipo: 'openai', url: 'https://api.mistral.ai/v1/chat/completions', chave: process.env.MISTRAL_API_KEY, model: m, imagemTexto: true });
  if (process.env.GEMINI_API_KEY) for (const m of lista(process.env.MODELOS_GEMMA, 'gemma-4-31b-it,gemma-4-26b-a4b-it'))
    google.push({ nome: `Google ${m}`, tipo: 'gemini', chave: process.env.GEMINI_API_KEY, model: m });
  if (process.env.OPENROUTER_API_KEY) for (const m of lista(comImagem ? process.env.MODELOS_OPENROUTER_FOTOS : process.env.MODELOS_OPENROUTER,
    comImagem ? 'google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free' : 'google/gemma-4-31b-it:free,nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free'))
    openrouter.push({ nome: `OpenRouter ${m}`, tipo: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions', chave: process.env.OPENROUTER_API_KEY, model: m });
  // O OpenRouter gratuito tem cota DIÁRIA baixa, então fica guardado para o que o Google não dá conta:
  // as chamadas grandes (prova, revisões), onde pesa o limite de tokens por minuto do Google.
  // Fotos e conferência do resumo são pedidos pequenos: Google primeiro, que aguenta muitos por dia.
  return grande ? [...mistral, ...openrouter, ...google] : [...mistral, ...google, ...openrouter];
}

function extrairJSON(txt) {
  const t = String(txt || '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw new Pular('resposta não veio em JSON válido');
}

const instrucaoJSON = tool => `\n\nResponda SOMENTE com um único objeto JSON válido (sem texto antes ou depois, sem \`\`\`) que siga exatamente este esquema JSON:\n${JSON.stringify(tool.input_schema)}`;

// Prazo da rodada: nenhuma chamada passa dele. Fica aqui para não ter de atravessar todas as funções.
let prazoRodada = 0;
export function definirPrazo(ms) { prazoRodada = ms || 0; }
const restaDoPrazo = () => (prazoRodada ? prazoRodada - Date.now() : Infinity);

let faltamProvedores = 1, primeiroProvedor = true;
async function comTempo(url, opts, ms = 160000) { // teto por IA, sempre dentro da rodada
  // O primeiro provedor é o que costuma responder; os que recusam na hora (429) não gastam tempo,
  // então sobra rodada sem uso. Dá 60% dela ao primeiro e divide o resto entre os seguintes.
  const fatia = primeiroProvedor ? restaDoPrazo() * 0.6 : restaDoPrazo() / Math.max(1, faltamProvedores);
  const limite = Math.min(ms, Math.max(25000, fatia));
  if (limite < 5000) throw new Pular('sem tempo nesta rodada');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), limite);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); }
  catch (e) { throw new Pular(e.name === 'AbortError' ? 'demorou demais' : 'sem conexão'); }
  finally { clearTimeout(t); }
}

class Esperar extends Error { constructor(seg) { super('limite por minuto'); this.seg = seg; } }
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function checar(res, p) {
  if (res.ok) return;
  const txt = (await res.text()).slice(0, 2000);
  if (res.status === 500 && p?.tipo === 'gemini') throw new Esperar(5); // instabilidade passageira
  if (res.status === 429 && p?.tipo === 'gemini') { // limite por minuto do Google: vale esperar um pouco
    const s = Number((txt.match(/"retryDelay":\s*"(\d+)/) || [])[1] || 20);
    if (s <= 20) throw new Esperar(s);
  }
  if ([408, 409, 413, 422, 429, 500, 502, 503, 504, 529].includes(res.status) || res.status === 400 && /token|context|length|too large|quota/i.test(txt)) throw new Pular(`erro ${res.status}`);
  throw new Pular(`erro ${res.status}: ${txt}`);
}

// ---------- APIs no formato OpenAI (Mistral, OpenRouter) ----------
async function chamarOpenAI(p, { system, content, tool, maxTokens }) {
  const partes = content.map(c => c.type === 'image'
    ? { type: 'image_url', image_url: p.imagemTexto ? `data:${c.source.media_type};base64,${c.source.data}` : { url: `data:${c.source.media_type};base64,${c.source.data}` } }
    : { type: 'text', text: c.text });
  const res = await comTempo(p.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${p.chave}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: p.model, max_tokens: maxTokens, temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system + instrucaoJSON(tool) }, { role: 'user', content: partes }],
    }),
  });
  await checar(res);
  const j = await res.json();
  const ch = j.choices?.[0];
  if (!ch) throw new Pular('sem resposta');
  if (ch.finish_reason === 'length') throw new Pular('resposta cortada');
  const msg = ch.message?.content;
  return extrairJSON(Array.isArray(msg) ? msg.map(x => x.text || '').join('') : msg);
}

// ---------- API do Google (Gemma 4) ----------
async function chamarGemini(p, { system, content, tool, maxTokens }) {
  const parts = content.map(c => c.type === 'image'
    ? { inline_data: { mime_type: c.source.media_type, data: c.source.data } }
    : { text: c.text });
  const res = await comTempo(`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': p.chave, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system + instrucaoJSON(tool) }] },
      contents: [{ role: 'user', parts }],
      // Respeita o maxTokens pedido. Forçar 16000 aqui inflava a reserva de tokens por minuto
      // do Google (erro "limite por minuto") e deixava a resposta lenta, mesmo em pedidos pequenos.
      generationConfig: { maxOutputTokens: Math.max(maxTokens, 2000), temperature: 0.4 },
    }),
  });
  await checar(res, p);
  const j = await res.json();
  const cand = j.candidates?.[0];
  if (!cand) throw new Pular('sem resposta' + (j.promptFeedback?.blockReason ? ` (${j.promptFeedback.blockReason})` : ''));
  const partes = cand.content?.parts || [];
  const util = partes.filter(x => x.text && !x.thought).map(x => x.text).join('');
  if (cand.finishReason === 'MAX_TOKENS') {
    // Diz ONDE os tokens foram parar: em raciocínio interno ou em resposta mesmo.
    const pensou = partes.filter(x => x.thought).map(x => x.text || '').join('').length;
    const u = j.usageMetadata || {};
    throw new Pular(`resposta cortada [texto ${util.length}c, pensamento ${pensou}c, tokens ${u.candidatesTokenCount ?? '?'}/${u.thoughtsTokenCount ?? 0} pensando]`);
  }
  return extrairJSON(util);
}

async function chamarIA({ system, content, tool, maxTokens = 16000, grande = false }) {
  const ps = provedores(content.some(c => c.type === 'image'), grande);
  if (!ps.length) throw new ErroIA('A chave da IA ainda não foi configurada. Coloque GEMINI_API_KEY e OPENROUTER_API_KEY nas variáveis da Vercel.');
  const falhas = [];
  for (const [idx, p] of ps.entries()) {
    faltamProvedores = ps.length - idx; primeiroProvedor = idx === 0;
    if (restaDoPrazo() < 8000) { falhas.push('tempo da rodada esgotado'); break; }
    const t0 = Date.now();
    try {
      let r;
      if (p.tipo === 'gemini') {
        for (let t = 0; ; t++) {
          try { r = await chamarGemini(p, { system, content, tool, maxTokens }); break; }
          catch (e) {
            if (!(e instanceof Esperar) || t >= 2 || restaDoPrazo() < (e.seg + 10) * 1000) throw e instanceof Esperar ? new Pular('limite por minuto') : e;
            await dormir((e.seg + 2) * 1000);
          }
        }
      } else r = await chamarOpenAI(p, { system, content, tool, maxTokens });
      const faltando = (tool.input_schema.required || []).filter(k => tool.input_schema.properties[k]?.type === 'array' && !Array.isArray(r?.[k]));
      if (faltando.length) throw new Pular(`resposta sem ${faltando.join(', ')}`);
      return r;
    } catch (e) {
      if (!(e instanceof Pular)) throw e;
      falhas.push(`${p.nome}: ${e.message} (${Math.round((Date.now() - t0) / 1000)}s)`);
      console.warn('[ia]', p.nome, e.message, Math.round((Date.now() - t0) / 1000) + 's');
    }
  }
  // Acabou o tempo da rodada (não é limite de IA): quem chamou retoma na próxima.
  if (restaDoPrazo() < 8000) { const e = new ErroIA('Sem tempo nesta rodada; continua na próxima.'); e.semTempo = true; e.temporario = true; throw e; }
  const erro = new ErroIA('Todas as IAs gratuitas estão no limite ou fora do ar agora. Detalhe: ' + falhas.join(' · '));
  erro.temporario = true;
  throw erro;
}

// ---------- esquemas ----------
const str = { type: 'string' };
const arrStr = { type: 'array', items: str };

const TOOL_PAGINA = {
  name: 'registrar_pagina',
  description: 'Registra a transcrição fiel da página de apostila.',
  input_schema: {
    type: 'object',
    properties: {
      paginas: { type: 'array', description: 'Uma entrada por página que aparece na foto.', items: { type: 'object', properties: { numero: { type: ['string', 'null'] }, texto_md: str }, required: ['numero', 'texto_md'] } },
      materia_detectada: str, ano_detectado: str, trimestre: str,
      origem: { type: 'string', enum: ['digital', 'fisica', 'desconhecida'] },
      e_atividade: { type: 'boolean' }, legivel: { type: 'boolean' }, observacoes: str,
    },
    required: ['paginas', 'origem', 'e_atividade', 'legivel'],
  },
};

const TOOL_ANEXO = {
  name: 'registrar_revisao_material',
  description: 'Registra a revisão de qualidade do material.',
  input_schema: {
    type: 'object',
    properties: {
      anexo_erros_md: str,
      topicos: { type: 'array', items: { type: 'object', properties: { titulo: str, paginas: str }, required: ['titulo'] } },
      paginas_faltando: arrStr,
      paginas_fora: { type: 'array', items: { type: 'object', properties: { pagina: str, motivo: str }, required: ['pagina', 'motivo'] } },
      destaques_md: str,
    },
    required: ['anexo_erros_md', 'topicos'],
  },
};

const ITEM = {
  type: 'object',
  properties: {
    texto: str, opcoes: arrStr, correta: str, resposta: str,
    antes: str, depois: str, palavra: str,
    linhas: { type: 'integer' }, dicas: { type: 'array', items: { type: 'integer' } },
  },
};
const QUESTAO = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: ['pinte', 'assinale', 'vf', 'marque_x', 'letras', 'complete_quadro', 'complete', 'numere', 'adivinhe', 'responda', 'defina', 'texto', 'cruzadinha', 'quadrinhos'] },
    enunciado: str, pontos: str, pontuacao: str,
    itens: { type: 'array', items: ITEM },
    quadro: arrStr, colunaA: arrStr, texto: str,
    palavras: { type: 'array', items: { type: 'object', properties: { palavra: str, pista: str }, required: ['palavra', 'pista'] } },
    gabarito: arrStr, respostas_chave: arrStr,
  },
  required: ['tipo', 'enunciado', 'pontos', 'gabarito', 'respostas_chave'],
};
const TOOL_PROVA = {
  name: 'registrar_prova',
  description: 'Registra a prova completa com gabarito.',
  input_schema: {
    type: 'object',
    properties: {
      titulo: str, abertura: str,
      questoes: { type: 'array', items: QUESTAO },
      termos_proibidos: arrStr, fora_da_prova: str, resumo_questoes: arrStr,
    },
    required: ['titulo', 'abertura', 'questoes', 'termos_proibidos', 'resumo_questoes'],
  },
};
const TOOL_REVISOES = {
  name: 'registrar_revisoes',
  description: 'Registra as fichas de revisão com respostas.',
  input_schema: {
    type: 'object',
    properties: {
      comando: str,
      fichas: { type: 'array', items: { type: 'object', properties: { tema: str, perguntas: { type: 'array', items: { type: 'object', properties: { texto: str, resposta: str }, required: ['texto', 'resposta'] } } }, required: ['tema', 'perguntas'] } },
    },
    required: ['fichas'],
  },
};

// ---------- tarefas ----------
export async function transcreverPagina({ imagemBase64, mediaType, turma, materia, dica }) {
  return chamarIA({
    system: REGRAS_TRANSCRICAO, tool: TOOL_PAGINA, maxTokens: 8000,
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imagemBase64 } },
      { type: 'text', text: `Material da turma ${turma}, matéria ${materia}.${dica ? ' Observação da professora: ' + dica : ''}\nTranscreva esta página fielmente.` },
    ],
  });
}

export async function revisarMaterial({ resumo, turma, materia, descricao, parte }) {
  const trecho = parte ? `\nATENÇÃO: este é o trecho ${parte.n} de ${parte.total} do material (páginas ${parte.paginas}). Revise SÓ este trecho: "topicos" só deste trecho e "paginas_faltando" vazio (o sistema calcula).` : '';
  return chamarIA({
    system: REGRAS_ANEXO, tool: TOOL_ANEXO, maxTokens: 6000,
    content: [{ type: 'text', text: `Turma: ${turma}. Matéria: ${materia}.${descricao ? '\nO que a professora disse sobre este material: ' + descricao : ''}${trecho}\n\nTRANSCRIÇÃO DAS PÁGINAS:\n\n${resumo}` }],
  });
}

function blocoContexto({ turma, idade, materia, nome, data, conteudos, historico, pedidos, regrasExtras }) {
  let t = `Turma: ${turma}${idade ? ` (crianças de ${idade} anos)` : ''}. Matéria: ${materia}. Avaliação: ${nome}${data ? `, aplicada em ${data}` : ''}.\n`;
  t += `Título da prova: "${nome} de ${materia} – ${turma}".\n`;
  if (pedidos) t += `\nPEDIDOS DA PROFESSORA PARA ESTA AVALIAÇÃO (seguir):\n${pedidos}\n`;
  if (regrasExtras) t += `\nPREFERÊNCIAS FIXAS DA PROFESSORA (seguir sempre):\n${regrasExtras}\n`;
  if (historico) t += `\nQUESTÕES JÁ USADAS EM PROVAS E REVISÕES ANTERIORES DESTA TURMA E MATÉRIA (não repetir):\n${historico}\n`;
  t += `\n===== ESCOPO DA PROVA (resumo fiel da apostila) =====\n`;
  for (const c of conteudos) {
    t += `\n### ${c.titulo}\n${c.resumo_md || ''}\n`;
    if (c.anexo_erros_md) t += `\n#### Pontos a conferir de "${c.titulo}" (NÃO COBRAR)\n${c.anexo_erros_md}\n`;
  }
  return t;
}

// ---------- etapas (pedidos pequenos, para caber nas IAs gratuitas) ----------
const TIPOS = ['pinte', 'assinale', 'vf', 'marque_x', 'letras', 'complete_quadro', 'complete', 'numere', 'adivinhe', 'responda', 'defina', 'texto', 'cruzadinha', 'quadrinhos'];

const TOOL_PLANO_PROVA = {
  name: 'registrar_plano_prova',
  description: 'Registra o plano da prova: a abertura e a lista de questões previstas, sem escrevê-las ainda.',
  input_schema: {
    type: 'object',
    properties: {
      abertura: str,
      questoes: { type: 'array', items: { type: 'object', properties: {
        tipo: { type: 'string', enum: TIPOS }, assunto: str, paginas: str, pontos: str,
      }, required: ['tipo', 'assunto', 'pontos'] } },
    },
    required: ['abertura', 'questoes'],
  },
};
const TOOL_QUESTOES = {
  name: 'registrar_questao',
  description: 'Registra UMA questão, já escrita por inteiro e com gabarito.',
  input_schema: { type: 'object', properties: { questoes: { type: 'array', description: 'Exatamente uma questão.', items: QUESTAO } }, required: ['questoes'] },
};
const TOOL_PLANO_REVISOES = {
  name: 'registrar_plano_revisoes',
  description: 'Registra o plano das fichas de revisão, sem escrever as perguntas ainda.',
  input_schema: {
    type: 'object',
    properties: {
      comando: str,
      fichas: { type: 'array', items: { type: 'object', properties: { tema: str, paginas: str }, required: ['tema'] } },
    },
    required: ['fichas'],
  },
};
const TOOL_FICHAS = {
  name: 'registrar_fichas',
  description: 'Registra as fichas deste lote, com perguntas e respostas.',
  input_schema: { type: 'object', properties: { fichas: { type: 'array', items: { type: 'object', properties: {
    tema: str, perguntas: { type: 'array', items: { type: 'object', properties: { texto: str, resposta: str }, required: ['texto', 'resposta'] } },
  }, required: ['tema', 'perguntas'] } } }, required: ['fichas'] },
};

// Plano da prova: recebe só os tópicos e o anexo, nunca o resumo inteiro.
export async function planejarProva(ctx, { mapa }) {
  const txt = blocoContexto({ ...ctx, conteudos: [] })
    + `\n===== ASSUNTOS DISPONÍVEIS (use as páginas para localizar o conteúdo depois) =====\n${mapa}\n`
    + `\nMonte APENAS O PLANO da prova agora: a frase de abertura e a lista de questões previstas.`
    + `\nPara cada questão diga o tipo, o assunto, as páginas de onde sai e a pontuação.`
    + `\nA soma das pontuações TEM que dar exatamente 10,0. Use pelo menos 7 tipos diferentes e não repita o mesmo tipo em questões seguidas.`
    + `\nNÃO escreva os enunciados nem as alternativas ainda.`;
  return chamarIA({ system: REGRAS_PROVA, tool: TOOL_PLANO_PROVA, maxTokens: 4000, content: [{ type: 'text', text: txt }] });
}

// Um lote de questões: recebe só o trecho das páginas que ele cobre.
export async function escreverQuestoes(ctx, { plano, lote, trecho, jaFeitas }) {
  // Sem histórico aqui: ele serve para o plano não repetir provas antigas, e repeti-lo em cada
  // questão era mandar todas as provas anteriores dez vezes.
  const txt = blocoContexto({ ...ctx, conteudos: [], historico: '' })
    + `\n===== TRECHO DA APOSTILA PARA ESTE LOTE =====\n${trecho}\n`
    + (jaFeitas.length ? `\n===== QUESTÕES JÁ ESCRITAS NESTA PROVA (não repetir assunto nem formato) =====\n${jaFeitas.map((q, i) => `${i + 1}. [${q.tipo}] ${q.enunciado}`).join('\n')}\n` : '')
    + `\n===== A QUESTÃO QUE VOCÊ DEVE ESCREVER AGORA =====\n`
    + lote.map(q => `Questão ${q.n} de ${plano?.questoes?.length || 10}: tipo "${q.tipo}", assunto "${q.assunto}", vale ${q.pontos}.`).join('\n')
    + `\n\nEscreva SÓ essa questão, por inteiro (enunciado, itens, gabarito, pontuacao e respostas_chave). Mantenha exatamente o tipo e a pontuação indicados. Devolva "questoes" com um único item.`;
  return chamarIA({ system: regrasQuestaoDe(lote[0]?.tipo), tool: TOOL_QUESTOES, maxTokens: 8000, content: [{ type: 'text', text: txt }] });
}

export async function planejarRevisoes(ctx, { mapa, prova, proibidos }) {
  const txt = blocoContexto({ ...ctx, conteudos: [] })
    + `\n===== ASSUNTOS DISPONÍVEIS =====\n${mapa}\n`
    + `\n===== RESUMO DA PROVA (as revisões não podem repetir nada disto) =====\n${(prova.resumo_questoes || []).join('\n')}\n`
    + `\n===== TERMOS PROIBIDOS =====\n${proibidos.join(' | ')}\n`
    + `\nMonte APENAS O PLANO: o comando das fichas e os 8 temas, com as páginas de cada um. NÃO escreva as perguntas ainda.`;
  return chamarIA({ system: REGRAS_REVISOES, tool: TOOL_PLANO_REVISOES, maxTokens: 2500, content: [{ type: 'text', text: txt }] });
}

export async function escreverFichas(ctx, { lote, trecho, proibidos, jaFeitas }) {
  const txt = blocoContexto({ ...ctx, conteudos: [] })
    + `\n===== TRECHO DA APOSTILA PARA ESTE LOTE =====\n${trecho}\n`
    + `\n===== TERMOS PROIBIDOS (nem nas perguntas nem nas respostas) =====\n${proibidos.join(' | ')}\n`
    + (jaFeitas.length ? `\n===== PERGUNTAS JÁ FEITAS (não repetir) =====\n${jaFeitas.join('\n')}\n` : '')
    + `\n===== ESCREVA AGORA SÓ ESTAS FICHAS =====\n${lote.map(f => `- Ficha "${f.tema}" (páginas ${f.paginas || '—'})`).join('\n')}`;
  return chamarIA({ system: REGRAS_REVISOES, tool: TOOL_FICHAS, maxTokens: 2000, content: [{ type: 'text', text: txt }] });
}

export async function gerarProva(ctx, { atual, ajuste } = {}) {
  let txt = blocoContexto(ctx);
  if (atual) {
    txt += `\n\n===== PROVA ATUAL (JSON) =====\n${JSON.stringify(atual)}\n\n${REGRAS_AJUSTE}\nAJUSTE PEDIDO:\n${ajuste}`;
  } else {
    txt += `\n\nMonte a prova agora.`;
  }
  return chamarIA({ system: REGRAS_PROVA, tool: TOOL_PROVA, maxTokens: 20000, grande: true, content: [{ type: 'text', text: txt }] });
}

export async function gerarRevisoes(ctx, { prova, proibidos, atual, ajuste } = {}) {
  let txt = blocoContexto(ctx);
  txt += `\n\n===== PROVA (não pode haver NADA igual nas revisões) =====\n${JSON.stringify(prova)}\n`;
  txt += `\n===== TERMOS PROIBIDOS NAS REVISÕES (perguntas e respostas) =====\n${proibidos.join(' | ')}\n`;
  if (atual) txt += `\n===== REVISÕES ATUAIS (JSON) =====\n${JSON.stringify(atual)}\n\n${REGRAS_AJUSTE}\nAJUSTE PEDIDO:\n${ajuste}`;
  else txt += `\nMonte as 8 fichas agora.`;
  return chamarIA({ system: REGRAS_REVISOES, tool: TOOL_REVISOES, maxTokens: 12000, grande: true, content: [{ type: 'text', text: txt }] });
}
