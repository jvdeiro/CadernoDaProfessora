import { marked } from 'marked';
// Converte o markdown do resumo em HTML seguro, com as marcações da apostila.
export function mdParaHtml(md) {
  let s = String(md || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/&lt;(\/?)u&gt;/g, '<$1u>');
  s = s.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
  s = s.replace(/\[\[colchete a l[aá]pis:\s*([\s\S]+?)\]\]/gi, '<span class="colchete">($1)</span>');
  s = s.replace(/^\*\*\[(p\.[^\]]*)\]\*\*$/gm, '<span class="pgsep">$1</span>');
  return marked.parse(s, { gfm: true, breaks: false });
}
