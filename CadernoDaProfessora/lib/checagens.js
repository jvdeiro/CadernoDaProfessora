// Conferências automáticas, feitas por código (não dependem da IA).
import { contemTermo, ngramas, semAcento } from './texto.js';
import { montarCruzadinha } from './crossword.js';

export const num = p => parseFloat(String(p || '0').replace(',', '.')) || 0;

// Todo o texto que a criança vê numa questão
export function textoQuestao(Q) {
  const partes = [Q.enunciado, Q.texto, ...(Q.quadro || []), ...(Q.colunaA || [])];
  for (const it of Q.itens || []) partes.push(it.texto, it.antes, it.depois, it.tipo === 'defina' ? '' : '', ...(it.opcoes || []));
  if (Q.tipo === 'defina') for (const it of Q.itens || []) partes.push(it.palavra);
  for (const p of Q.palavras || []) partes.push(p.pista);
  return partes.filter(Boolean).join(' \n ');
}
export function textoProva(prova) {
  return [prova.abertura, ...(prova.questoes || []).map(textoQuestao)].join('\n');
}

export function checarProva(prova) {
  const problemas = [], avisos = [];
  const qs = prova.questoes || [];
  const soma = qs.reduce((a, Q) => a + num(Q.pontos), 0);
  if (Math.abs(soma - 10) > 0.01) problemas.push(`A soma dos pontos dá ${soma.toFixed(2).replace('.', ',')}, e não 10,0. Ajuste a pontuação das questões para somar exatamente 10,0.`);
  if (qs.length < 8 || qs.length > 12) avisos.push(`A prova tem ${qs.length} questões (o modelo usa cerca de 10).`);
  const textos = qs.map(textoQuestao);
  qs.forEach((Q, i) => {
    for (const termo of Q.respostas_chave || []) {
      if (!termo || termo.length < 3 || /^[VFX]$/i.test(termo)) continue;
      textos.forEach((t, j) => {
        if (j === i) return;
        // palavras de quadro/opções de outra questão também contam: a resposta não pode aparecer escrita
        if (contemTermo(t, termo)) problemas.push(`A resposta "${termo}" da questão ${i + 1} aparece escrita na questão ${j + 1}. Uma questão não pode entregar a resposta de outra: troque a resposta, o distrator ou o enunciado.`);
      });
    }
    if (Q.tipo === 'cruzadinha') {
      if (!montarCruzadinha(Q.palavras || [])) problemas.push(`As palavras da cruzadinha (questão ${i + 1}) não se cruzam numa grade. Troque por palavras com letras em comum.`);
    }
    if (Q.tipo === 'complete_quadro') {
      const quadro = (Q.quadro || []).map(semAcento);
      for (const it of Q.itens || []) if (it.resposta && !quadro.includes(semAcento(it.resposta))) problemas.push(`Na questão ${i + 1}, a resposta "${it.resposta}" não está no quadro de palavras.`);
    }
  });
  return { ok: problemas.length === 0, problemas: [...new Set(problemas)], avisos, soma };
}

// Lista de tudo o que as revisões não podem usar
export function termosProibidos(prova) {
  const t = new Set();
  for (const x of prova.termos_proibidos || []) t.add(x);
  for (const Q of prova.questoes || []) {
    (Q.respostas_chave || []).forEach(x => t.add(x));
    (Q.quadro || []).forEach(x => t.add(x));
    (Q.colunaA || []).forEach(x => t.add(x));
    (Q.palavras || []).forEach(p => t.add(p.palavra));
    for (const it of Q.itens || []) (it.opcoes || []).forEach(x => t.add(x));
  }
  return [...t].map(x => String(x).trim()).filter(x => x.length >= 3 && !/^[VFX]$/i.test(x));
}

export function checarRevisoes(rev, prova, quantas = 8) {
  const proibidos = termosProibidos(prova);
  const problemas = [];
  const ngProva = ngramas(textoProva(prova), 5);
  (rev.fichas || []).forEach((f, i) => {
    (f.perguntas || []).forEach((p, j) => {
      const txt = `${f.tema} ${p.texto} ${p.resposta}`;
      const achados = proibidos.filter(t => contemTermo(txt, t));
      if (achados.length) problemas.push(`Ficha ${i + 1}, pergunta ${'abcdef'[j]}: usa termo(s) da prova (${achados.join(', ')}). Troque por outro fato do mesmo assunto.`);
      const iguais = [...ngramas(txt, 5)].filter(g => ngProva.has(g));
      if (iguais.length) problemas.push(`Ficha ${i + 1}, pergunta ${'abcdef'[j]}: repete um trecho da prova ("${iguais[0]}").`);
    });
  });
  if ((rev.fichas || []).length !== quantas) problemas.push(`São ${(rev.fichas || []).length} fichas; o formato pede ${quantas}.`);
  return { ok: problemas.length === 0, problemas, proibidos };
}
