// Chamadas à IA com saída estruturada.
// Usa o Gemini (faixa gratuita do Google) quando GEMINI_API_KEY existe; senão, o Claude (ANTHROPIC_API_KEY).
import { REGRAS_TRANSCRICAO, REGRAS_ANEXO, REGRAS_PROVA, REGRAS_REVISOES, REGRAS_AJUSTE } from './regras.js';

const USA_GEMINI = !!process.env.GEMINI_API_KEY;
const MODELOS = USA_GEMINI
  ? { rapido: process.env.MODELO_RAPIDO || 'gemini-3.5-flash-lite', principal: process.env.MODELO_PRINCIPAL || 'gemini-3.8-flash' }
  : { rapido: process.env.MODELO_RAPIDO || 'claude-sonnet-5-5', principal: process.env.MODELO_PRINCIPAL || 'claude-opus-5-5' };

export class ErroIA extends Error {}

function chamarIA({ nivel, system, content, tool, maxTokens }) {
  const model = MODELOS[nivel];
  return USA_GEMINI ? chamarGemini({ model, system, content, tool, maxTokens }) : chamarClaude({ model, system, content, tool, maxTokens });
}

// ---------- Gemini ----------
// Converte o esquema JSON para o formato de esquema do Gemini (tipos em maiúsculas, "nullable").
function esquemaGemini(s) {
  if (Array.isArray(s)) return s.map(esquemaGemini);
  if (!s || typeof s !== 'object') return s;
  const o = {};
  let tipo = s.type;
  if (Array.isArray(tipo)) { o.nullable = tipo.includes('null'); tipo = tipo.find(t => t !== 'null'); }
  if (tipo) o.type = String(tipo).toUpperCase();
  if (s.description) o.description = s.description;
  if (s.enum) o.enum = s.enum;
  if (s.properties) o.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, esquemaGemini(v)]));
  if (s.required) o.required = s.required;
  if (s.items) o.items = esquemaGemini(s.items);
  return o;
}

async function chamarGemini({ model, system, content, tool }) {
  const maxTokens = 60000; // no Gemini o "raciocínio" também conta nesse limite
  const key = process.env.GEMINI_API_KEY;
  const parts = content.map(c => c.type === 'image'
    ? { inline_data: { mime_type: c.source.media_type, data: c.source.data } }
    : { text: c.text });
  const corpo = (comEsquema) => ({
    systemInstruction: { parts: [{ text: system + (comEsquema ? '' : `\n\nResponda SOMENTE com um JSON válido que siga este esquema:\n${JSON.stringify(tool.input_schema)}`) }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: maxTokens, ...(comEsquema ? { responseSchema: esquemaGemini(tool.input_schema) } : {}) },
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const enviar = async (comEsquema) => fetch(url, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(corpo(comEsquema)) });
  let res = await enviar(true);
  if (res.status === 400) res = await enviar(false); // esquema recusado: tenta com o esquema no texto
  if (res.status === 429) throw new ErroIA('O limite gratuito da IA foi atingido por agora. Espere alguns minutos e tente de novo (se continuar, o limite do dia acabou e volta amanhã).');
  if (!res.ok) throw new ErroIA(`A IA respondeu com erro (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const cand = j.candidates?.[0];
  if (!cand) throw new ErroIA('A IA não respondeu' + (j.promptFeedback?.blockReason ? ` (bloqueio: ${j.promptFeedback.blockReason})` : '') + '. Tente de novo.');
  if (cand.finishReason === 'MAX_TOKENS') throw new ErroIA('A resposta da IA ficou grande demais e foi cortada. Tente de novo com menos páginas de uma vez.');
  const txt = (cand.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
  try { return JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
  catch { throw new ErroIA('A IA devolveu uma resposta incompleta. Tente de novo.'); }
}

// ---------- Claude ----------
async function chamarClaude({ model, system, content, tool, maxTokens = 16000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ErroIA('A chave da IA ainda não foi configurada (GEMINI_API_KEY na Vercel).');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: maxTokens, system, stream: true,
      messages: [{ role: 'user', content }],
      tools: [tool], tool_choice: { type: 'tool', name: tool.name },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new ErroIA(`A IA respondeu com erro (${res.status}): ${txt.slice(0, 300)}`);
  }
  // Lê o stream (SSE) e junta o JSON da ferramenta
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', json = '', stop = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const ev = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = ev.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      let d; try { d = JSON.parse(line.slice(6)); } catch { continue; }
      if (d.type === 'content_block_delta' && d.delta?.type === 'input_json_delta') json += d.delta.partial_json;
      if (d.type === 'message_delta' && d.delta?.stop_reason) stop = d.delta.stop_reason;
      if (d.type === 'error') throw new ErroIA('A IA teve um problema: ' + (d.error?.message || 'erro desconhecido'));
    }
  }
  if (stop === 'max_tokens') throw new ErroIA('A resposta da IA ficou grande demais e foi cortada. Tente de novo com menos páginas de uma vez.');
  try { return JSON.parse(json); } catch { throw new ErroIA('A IA devolveu uma resposta incompleta. Tente de novo.'); }
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
    nivel: 'rapido', system: REGRAS_TRANSCRICAO, tool: TOOL_PAGINA, maxTokens: 8000,
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imagemBase64 } },
      { type: 'text', text: `Material da turma ${turma}, matéria ${materia}.${dica ? ' Observação da professora: ' + dica : ''}\nTranscreva esta página fielmente.` },
    ],
  });
}

export async function revisarMaterial({ resumo, turma, materia, descricao }) {
  return chamarIA({
    nivel: USA_GEMINI ? 'rapido' : 'principal', system: REGRAS_ANEXO, tool: TOOL_ANEXO, maxTokens: 8000,
    content: [{ type: 'text', text: `Turma: ${turma}. Matéria: ${materia}.${descricao ? '\nO que a professora disse sobre este material: ' + descricao : ''}\n\nTRANSCRIÇÃO DAS PÁGINAS:\n\n${resumo}` }],
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

export async function gerarProva(ctx, { atual, ajuste } = {}) {
  let txt = blocoContexto(ctx);
  if (atual) {
    txt += `\n\n===== PROVA ATUAL (JSON) =====\n${JSON.stringify(atual)}\n\n${REGRAS_AJUSTE}\nAJUSTE PEDIDO:\n${ajuste}`;
  } else {
    txt += `\n\nMonte a prova agora.`;
  }
  return chamarIA({ nivel: 'principal', system: REGRAS_PROVA, tool: TOOL_PROVA, maxTokens: 20000, content: [{ type: 'text', text: txt }] });
}

export async function gerarRevisoes(ctx, { prova, proibidos, atual, ajuste } = {}) {
  let txt = blocoContexto(ctx);
  txt += `\n\n===== PROVA (não pode haver NADA igual nas revisões) =====\n${JSON.stringify(prova)}\n`;
  txt += `\n===== TERMOS PROIBIDOS NAS REVISÕES (perguntas e respostas) =====\n${proibidos.join(' | ')}\n`;
  if (atual) txt += `\n===== REVISÕES ATUAIS (JSON) =====\n${JSON.stringify(atual)}\n\n${REGRAS_AJUSTE}\nAJUSTE PEDIDO:\n${ajuste}`;
  else txt += `\nMonte as 8 fichas agora.`;
  return chamarIA({ nivel: 'principal', system: REGRAS_REVISOES, tool: TOOL_REVISOES, maxTokens: 12000, content: [{ type: 'text', text: txt }] });
}
