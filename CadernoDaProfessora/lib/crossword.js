// Monta a grade de uma cruzadinha: cada palavra nova cruza exatamente uma palavra já colocada.
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function cells(w, r, c, d) {
  return [...w].map((ch, i) => [d === 'V' ? r + i : r, d === 'H' ? c + i : c, ch]);
}
const key = (r, c) => r + ',' + c;

function fits(grid, w, r, c, d) {
  const cs = cells(w, r, c, d);
  let cross = 0;
  for (const [rr, cc, ch] of cs) {
    const k = key(rr, cc);
    if (grid.has(k)) {
      if (grid.get(k) !== ch) return -1;
      cross++;
    } else {
      const nb = d === 'H' ? [key(rr - 1, cc), key(rr + 1, cc)] : [key(rr, cc - 1), key(rr, cc + 1)];
      if (nb.some(n => grid.has(n))) return -1;
    }
  }
  const [fr, fc] = cs[0], [lr, lc] = cs[cs.length - 1];
  const before = d === 'H' ? key(fr, fc - 1) : key(fr - 1, fc);
  const after = d === 'H' ? key(lr, lc + 1) : key(lr + 1, lc);
  if (grid.has(before) || grid.has(after)) return -1;
  return cross;
}

function search(ws, d0, maxW, maxH, budget) {
  let best = null;
  const rec = (i, grid, placed) => {
    if (budget.n-- <= 0) return;
    if (i === ws.length) {
      const rs = [], cs = [];
      for (const k of grid.keys()) { const [r, c] = k.split(',').map(Number); rs.push(r); cs.push(c); }
      const minR = Math.min(...rs), minC = Math.min(...cs);
      const h = Math.max(...rs) - minR + 1, w = Math.max(...cs) - minC + 1;
      if (w <= maxW && h <= maxH) {
        const score = w * h + w;
        if (!best || score < best.score) best = { score, placed: placed.map(p => ({ ...p })), minR, minC };
      }
      return;
    }
    const w = ws[i];
    const cands = [];
    for (const [k, ch] of grid.entries()) {
      const [pr, pc] = k.split(',').map(Number);
      [...w].forEach((c2, j) => {
        if (c2 !== ch) return;
        for (const d of ['H', 'V']) {
          const r = d === 'H' ? pr : pr - j, c = d === 'H' ? pc - j : pc;
          if (fits(grid, w, r, c, d) === 1) cands.push([r, c, d]);
        }
      });
    }
    for (const [r, c, d] of cands) {
      const g2 = new Map(grid);
      for (const [rr, cc, ch] of cells(w, r, c, d)) g2.set(key(rr, cc), ch);
      rec(i + 1, g2, [...placed, { i: i, r, c, d }]);
    }
  };
  const g = new Map();
  for (const [r, c, ch] of cells(ws[0], 0, 0, d0)) g.set(key(r, c), ch);
  rec(1, g, [{ i: 0, r: 0, c: 0, d: d0 }]);
  return best;
}

function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
}

// palavras: [{palavra, pista}] → { W, H, itens: [{palavra, pista, r, c, d, n}] } ou null
export function montarCruzadinha(palavras, maxW = 12, maxH = 11) {
  const ws = palavras.map(p => norm(p.palavra).replace(/[^A-Z]/g, ''));
  let best = null;
  const budget = { n: 400000 };
  for (const order of permutations(ws.map((_, i) => i))) {
    for (const d0 of ['H', 'V']) {
      const res = search(order.map(i => ws[i]), d0, maxW, maxH, budget);
      if (res && (!best || res.score < best.score)) best = { ...res, order };
    }
  }
  if (!best) return null;
  const itens = best.placed.map(p => {
    const idx = best.order[p.i];
    return { palavra: ws[idx], pista: palavras[idx].pista, original: palavras[idx].palavra, r: p.r - best.minR, c: p.c - best.minC, d: p.d };
  });
  const starts = [...new Set(itens.map(p => key(p.r, p.c)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  });
  itens.forEach(p => { p.n = starts.indexOf(key(p.r, p.c)) + 1; });
  itens.sort((a, b) => a.n - b.n || (a.d === 'H' ? -1 : 1));
  const W = Math.max(...itens.map(p => p.d === 'H' ? p.c + p.palavra.length : p.c + 1));
  const H = Math.max(...itens.map(p => p.d === 'V' ? p.r + p.palavra.length : p.r + 1));
  return { W, H, itens };
}
