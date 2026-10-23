// Junta as páginas transcritas na ordem da apostila (digital primeiro, depois física, por número de página).
const n = s => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0]) : 9999; };

export function montarResumo(pags) {
  const itens = [];
  for (const p of pags) {
    const t = p.transcricao || {};
    for (const pg of t.paginas || []) itens.push({ numero: pg.numero, texto: pg.texto_md, origem: t.origem, atividade: t.e_atividade, ordem: p.ordem });
  }
  itens.sort((a, b) => (a.origem === b.origem ? 0 : a.origem === 'digital' ? -1 : 1) || n(a.numero) - n(b.numero) || a.ordem - b.ordem);
  const vistos = new Set();
  return itens.filter(x => { const k = x.origem + x.numero; if (x.numero && vistos.has(k)) return false; vistos.add(k); return true; })
    .map(x => `**[p. ${x.numero || '?'}${x.origem === 'digital' ? ' · apostila digital' : x.origem === 'fisica' ? ' · apostila física' : ''}${x.atividade ? ' · página de atividades' : ''}]**\n\n${x.texto}`)
    .join('\n\n');
}

