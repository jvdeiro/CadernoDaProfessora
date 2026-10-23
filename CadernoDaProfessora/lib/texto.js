// Utilidades de texto usadas nas checagens automáticas.
export const semAcento = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Procura o termo como palavra inteira (ou prefixo de palavra, quando o termo termina com *).
export function contemTermo(texto, termo) {
  const t = semAcento(texto);
  let q = semAcento(termo).trim();
  if (!q || q.length < 3) return false;
  const prefixo = q.endsWith('*');
  if (prefixo) q = q.slice(0, -1);
  const re = new RegExp(`(^|[^a-z0-9])${escape(q)}${prefixo ? '' : '(?![a-z0-9])'}`);
  return re.test(t);
}

export function ngramas(texto, n = 4) {
  const w = semAcento(texto).match(/[a-z0-9]+/g) || [];
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}
