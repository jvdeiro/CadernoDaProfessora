// Junta as páginas transcritas na ordem da apostila (digital primeiro, depois física, por número de página).
const n = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0]) : 9999; };

export function blocosResumo(pags) {
  const itens = [];
  for (const p of pags) {
    const t = p.transcricao || {};
    for (const pg of t.paginas || []) itens.push({ numero: pg.numero, texto: pg.texto_md, origem: t.origem, atividade: t.e_atividade, ordem: p.ordem });
  }
  itens.sort((a, b) => (a.origem === b.origem ? 0 : a.origem === 'digital' ? -1 : 1) || n(a.numero) - n(b.numero) || a.ordem - b.ordem);
  const vistos = new Set();
  return itens.filter(x => { const k = x.origem + x.numero; if (x.numero && vistos.has(k)) return false; vistos.add(k); return true; })
    .map(x => ({ ...x, md: `**[p. ${x.numero || '?'}${x.origem === 'digital' ? ' · apostila digital' : x.origem === 'fisica' ? ' · apostila física' : ''}${x.atividade ? ' · página de atividades' : ''}]**\n\n${x.texto}` }));
}

export function montarResumo(pags) {
  return blocosResumo(pags).map(x => x.md).join('\n\n');
}

// Divide o resumo em partes de tamanho parecido (para a IA conferir uma parte por vez).
export function partesResumo(blocos, limite = 12000) {
  const partes = [];
  let atual = [];
  for (const b of blocos) {
    if (atual.length && atual.reduce((s, x) => s + x.md.length, 0) + b.md.length > limite) { partes.push(atual); atual = []; }
    atual.push(b);
  }
  if (atual.length) {
    const tam = atual.reduce((s, x) => s + x.md.length, 0);
    if (partes.length && tam < limite * 0.3) partes[partes.length - 1].push(...atual); // sobra pequena vai junto da última parte
    else partes.push(atual);
  }
  return partes.map(p => ({
    texto: p.map(x => x.md).join('\n\n'),
    paginas: `${p[0].numero || '?'}–${p[p.length - 1].numero || '?'}`,
  }));
}

// Páginas que faltam na sequência, por apostila (digital/física), calculadas por código.
export function paginasFaltando(blocos) {
  const faltam = [];
  for (const origem of ['digital', 'fisica', 'desconhecida']) {
    const nums = [...new Set(blocos.filter(b => (b.origem || 'desconhecida') === origem).flatMap(b => String(b.numero || '').match(/\d+/g) || []).map(Number))].sort((a, b) => a - b);
    const pre = origem === 'digital' ? 'dig. ' : origem === 'fisica' ? 'fís. ' : '';
    for (let i = 1; i < nums.length; i++) {
      const de = nums[i - 1] + 1, ate = nums[i] - 1;
      if (ate >= de && ate - de < 15) faltam.push(de === ate ? `${pre}${de}` : `${pre}${de}–${ate}`);
    }
  }
  return faltam;
}
