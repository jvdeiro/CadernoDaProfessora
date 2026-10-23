// Gera arquivos .doc (formato RTF) que abrem no Word 97–2003, no Word novo, no WordPad e no LibreOffice.
// Monta a prova no modelo do Pirralho, o gabarito e as fichas de revisão.
import { LOGO_JPG_BASE64, LOGO_W, LOGO_H } from './logo.js';
import { montarCruzadinha } from './crossword.js';

// ---------- primitivas ----------
const LOGO_HEX = Buffer.from(LOGO_JPG_BASE64, 'base64').toString('hex');
export function esc(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '{') out += '\\{';
    else if (ch === '}') out += '\\}';
    else if (ch === '\n') out += '\\line ';
    else if (ch === '\t') out += '\\tab ';
    else if (c < 128) out += ch;
    else if (c > 0xffff) out += '?';
    else out += `\\u${c > 32767 ? c - 65536 : c}?`;
  }
  return out;
}
const F = { arial: 0, comic: 1, black: 2 };
export function run(text, o = {}) {
  const f = F[o.font || 'arial'];
  const fs = Math.round((o.size || 11) * 2);
  return `{\\f${f}\\fs${fs}${o.b ? '\\b' : ''}${o.i ? '\\i' : ''}${o.u ? '\\ul' : ''} ${esc(text)}}`;
}
export function para(runs, o = {}) {
  const q = { left: 'l', center: 'c', right: 'r', justify: 'j' }[o.align || 'left'];
  const r = Array.isArray(runs) ? runs.join('') : runs;
  return `\\pard\\plain${o.intbl ? '\\intbl' : ''}\\q${q}\\sb${o.sb ?? 0}\\sa${o.sa ?? 60}\\sl${o.sl ?? 240}\\slmult1${o.keepn ? '\\keepn' : ''}${o.keep ? '\\keep' : ''}\\li${o.li ?? 0}\\fi${o.fi ?? 0} ${r}\\par\n`;
}
const BRD = { s: '\\brdrs\\brdrw10', th: '\\brdrs\\brdrw25', dash: '\\brdrdash\\brdrw8\\brdrcf2', none: '\\brdrnone' };
// cells: [{w, content:[para(... , {intbl:true})], b:'s'|'th'|'dash'|'none' | {t,b,l,r}, v:'t'|'c'|'b', vm:'first'|'cont'}]
export function row(cells, o = {}) {
  let s = `\\trowd\\trgaph${o.gaph ?? 80}\\trleft${o.left ?? 0}`;
  if (o.h) s += `\\trrh${o.exact ? -o.h : o.h}`;
  if (o.keep !== false) s += '\\trkeep';
  const p = o.pad ?? 60;
  s += `\\trpaddl${p}\\trpaddr${p}\\trpaddt${o.padv ?? 40}\\trpaddb${o.padv ?? 40}\\trpaddfl3\\trpaddfr3\\trpaddft3\\trpaddfb3`;
  if (o.center) s += '\\trqc';
  let x = o.left ?? 0;
  for (const c of cells) {
    x += c.w;
    const b = typeof c.b === 'object' ? c.b : { t: c.b || 'none', b: c.b || 'none', l: c.b || 'none', r: c.b || 'none' };
    s += `\\clbrdrt${BRD[b.t || 'none']}\\clbrdrl${BRD[b.l || 'none']}\\clbrdrb${BRD[b.b || 'none']}\\clbrdrr${BRD[b.r || 'none']}`;
    if (c.vm === 'first') s += '\\clvmgf';
    if (c.vm === 'cont') s += '\\clvmrg';
    s += `\\clvertal${c.v || 't'}\\cellx${x}`;
  }
  s += '\n';
  for (const c of cells) {
    let body = (c.content && c.content.length ? c.content : [para('', { intbl: true, sa: 0 })]).join('');
    body = body.replace(/\\par\n$/, '\\cell\n');
    s += body;
  }
  return s + '\\row\n';
}
const cellP = (runs, o = {}) => para(runs, { ...o, intbl: true });
const logo = (wTw, hTw) => `{\\pict\\jpegblip\\picw${LOGO_W}\\pich${LOGO_H}\\picwgoal${wTw}\\pichgoal${hTw} ${LOGO_HEX}}`;

export function doc(body, o = {}) {
  const page = `\\paperw${o.pw ?? 11906}\\paperh${o.ph ?? 16838}\\margl${o.ml ?? 850}\\margr${o.mr ?? 850}\\margt${o.mt ?? 700}\\margb${o.mb ?? 700}`;
  const border = o.barra ? '\\pgbrdrl\\brdrthtnsg\\brdrw30\\brsp200\\pgbrdropt32' : '';
  return `{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\fscript\\fcharset0 Comic Sans MS;}{\\f2\\fswiss\\fcharset0 Arial Black;}}{\\colortbl;\\red0\\green0\\blue0;\\red128\\green128\\blue128;}\n${page}\\viewkind1\\sectd${border}\n${body}\\pard\\plain\\fs4\\par}`;
}

// ---------- prova ----------
const PAGE_W = 11906, MARGIN = 850, CONTENT = PAGE_W - 2 * MARGIN;
const SZ = 11;
const r = (t, o = {}) => run(t, { size: SZ, ...o });
const linhaResposta = () => para(r('_'.repeat(83)), { sb: 160, sa: 0 });
const fill = n => '_'.repeat(n);
const letras = 'abcdefghijklmnop';
const pts = p => (p ? ` (${p})` : '');

function cabecalho(titulo) {
  const W1 = 2250, W2 = 6150, W3 = CONTENT - W1 - W2;
  const cs = (t, o = {}) => run(t, { font: 'comic', size: 12, ...o });
  const meio = [
    cellP(cs(titulo, { b: true, u: true }), { align: 'center', sa: 80 }),
    cellP([cs('Data', { b: true, u: true }), cs(': ____ de _______________ de ' + new Date().getFullYear())], { align: 'center', sa: 40 }),
    cellP([cs('Professora:', { b: true, u: true }), cs(' Catarina')], { align: 'center', sa: 300 }),
    cellP(cs('_______________________________________'), { align: 'center', sa: 0 }),
    cellP(cs('Aluno', { b: true, u: true, size: 11 }), { align: 'center', sa: 0 }),
  ];
  return (
    row([
      { w: W1, vm: 'first', v: 'c', content: [cellP(logo(1920, 1307), { align: 'center', sa: 0 })] },
      { w: W2, vm: 'first', v: 'c', b: 'th', content: meio },
      { w: W3, v: 'b', b: { l: 'th', b: 'th' }, content: [cellP(run('NOTA', { font: 'black', size: 13, b: true }), { align: 'center', sa: 40 })] },
    ], { pad: 100 }) +
    row([
      { w: W1, vm: 'cont' }, { w: W2, vm: 'cont', b: 'th' },
      { w: W3, b: 'th', content: [cellP('', { sa: 0 })] },
    ], { h: 1250, pad: 100 })
  );
}

function caixa(linhas) {
  const w = CONTENT;
  return row([{ w, b: 's', v: 'c', content: linhas.map((l, i) => cellP(r(l, { b: true }), { align: 'center', sa: i === linhas.length - 1 ? 0 : 40 })) }], { pad: 180, padv: 100 });
}
function quebrarQuadro(palavras) {
  // divide as palavras do quadro em linhas que caibam na largura
  const linhas = []; let atual = [];
  for (const p of palavras) {
    const tent = [...atual, p].join('        ');
    if (tent.length > 78 && atual.length) { linhas.push(atual.join('        ')); atual = [p]; } else atual.push(p);
  }
  if (atual.length) linhas.push(atual.join('        '));
  return linhas;
}
function linhaPinte(opcoes) {
  const n = opcoes.length, GAP = 300, total = CONTENT - 360;
  const BW = Math.floor((total - (n - 1) * GAP) / n);
  const cells = [];
  opcoes.forEach((t, i) => {
    if (i) cells.push({ w: GAP });
    cells.push({ w: BW, b: 's', v: 'c', content: [cellP(r(t, { b: true }), { align: 'center', sa: 0 })] });
  });
  return row(cells, { left: 360, h: 440, padv: 60 });
}
function letterBoxes(n, dicas) {
  const W = 430;
  return row(Array.from({ length: n }, (_, i) => ({ w: W, b: 's', v: 'c', content: [cellP(dicas[i + 1] ? r(dicas[i + 1], { b: true }) : '', { align: 'center', sa: 0 })] })), { left: 120, h: 460, exact: true, gaph: 0, pad: 0 });
}
function duasColunas(esq, dir, LW) {
  const RW = CONTENT - LW;
  return esq.map((l, i) => row([
    { w: LW, v: 'c', content: [cellP(r(l, { b: true }), { sa: 0 })] },
    { w: RW, v: 'c', content: [cellP([r('(     )  '), r(dir[i] || '')], { sa: 0 })] },
  ], { padv: 50 })).join('');
}
function cruzadinha(palavras) {
  const cw = montarCruzadinha(palavras);
  if (!cw) return { rtf: para(r('[Não foi possível montar a cruzadinha com essas palavras.]', { i: true })), cw: null };
  const CW = Math.min(420, Math.floor((CONTENT - 200) / cw.W)), CH = 400;
  const g = Array.from({ length: cw.H }, () => Array(cw.W).fill(false));
  const num = Array.from({ length: cw.H }, () => Array(cw.W).fill(''));
  for (const p of cw.itens) {
    for (let i = 0; i < p.palavra.length; i++) g[p.d === 'V' ? p.r + i : p.r][p.d === 'H' ? p.c + i : p.c] = true;
    const atual = num[p.r][p.c];
    if (!atual.split('/').includes(String(p.n))) num[p.r][p.c] = atual ? atual + '/' + p.n : String(p.n);
  }
  let s = '';
  g.forEach((linha, i) => {
    s += row(linha.map((on, j) => ({ w: CW, b: on ? 's' : 'none', content: [cellP(num[i][j] ? run(num[i][j], { size: 7, b: true }) : '', { sa: 0, sl: 160 })] })), { left: 200, h: CH, exact: true, gaph: 0, pad: 30, padv: 0 });
  });
  s += para('', { sa: 120 });
  for (const p of cw.itens) s += para([r(`${p.n}. `, { b: true }), r(`(${p.d === 'H' ? '\u2192' : '\u2193'}) `), r(p.pista)], { sa: 80, li: 200 });
  return { rtf: s, cw };
}

const q = (n, enunciado, p) => para(r(`${n}. ${enunciado}${pts(p)}`, { b: true }), { sb: 240, sa: 100, keepn: true });
const item = (l, t, o = {}) => para(r(`${l}) ${t}`), { sb: o.sb ?? 120, sa: 40, keepn: true });

function renderQuestao(n, Q) {
  let s = q(n, Q.enunciado, Q.pontos);
  const it = Q.itens || [];
  switch (Q.tipo) {
    case 'pinte':
      it.forEach((x, i) => { s += item(letras[i], x.texto, { sb: i ? 160 : 0 }); s += para('', { sa: 40 }); s += linhaPinte(x.opcoes || []); });
      break;
    case 'assinale':
      it.forEach((x, i) => {
        s += item(letras[i], x.texto, { sb: i ? 140 : 0 });
        (x.opcoes || []).forEach((o, k, a) => { s += para([r('(     )  '), r(o)], { sa: 20, keepn: k < a.length - 1 }); });
      });
      break;
    case 'vf': case 'marque_x':
      it.forEach(x => { s += para([r('(     )  '), r(x.texto)], { sa: 70, keepn: true }); });
      break;
    case 'letras':
      it.forEach(x => { s += para([r('(     )  '), r(x.texto)], { sa: 70, keepn: true }); });
      break;
    case 'complete_quadro': case 'complete':
      if (Q.tipo === 'complete_quadro') s += caixa(quebrarQuadro(Q.quadro || []));
      it.forEach((x, i) => { s += para([r(`${letras[i]}) ${x.antes || ''}`), r(fill(x.tamanho || 16)), r(x.depois || '')], { sb: i ? 110 : 180, sa: 0, sl: 300 }); });
      break;
    case 'numere':
      s += duasColunas((Q.colunaA || []).map((t, i) => `(${i + 1})  ${t}`), it.map(x => x.texto), Q.larguraA || 3300);
      break;
    case 'adivinhe':
      if (Q.quadro?.length) s += caixa(quebrarQuadro(Q.quadro));
      it.forEach((x, i) => { s += item(letras[i], x.texto, { sb: i ? 140 : 180 }); s += para([r('Quem sou eu? ', { b: true }), r(fill(40))], { sb: 100, sa: 0 }); });
      break;
    case 'responda':
      it.forEach((x, i) => { s += item(letras[i], x.texto, { sb: i ? 120 : 0 }); for (let k = 0; k < (x.linhas || 1); k++) s += linhaResposta(); });
      break;
    case 'defina':
      it.forEach((x, i) => {
        s += para([r(`${letras[i]}) "${x.antes || ''}`), r(x.palavra || '', { b: true, u: true }), r(`${x.depois || ''}"`)], { sb: i ? 160 : 0, sa: 0, keepn: true });
        for (let k = 0; k < (x.linhas || 2); k++) s += linhaResposta();
      });
      break;
    case 'texto':
      s += row([{ w: CONTENT - 600, b: 's', content: String(Q.texto || '').split('\n').map(l => cellP(run(l, { font: 'comic', i: true, size: 11 }), { align: 'justify', sa: 60 })) }], { left: 300, pad: 180, padv: 100 });
      it.forEach((x, i) => { s += item(letras[i], x.texto, { sb: 180 }); for (let k = 0; k < (x.linhas || 1); k++) s += linhaResposta(); });
      break;
    case 'cruzadinha':
      s += cruzadinha(Q.palavras || []).rtf;
      break;
    case 'quadrinhos':
      it.forEach((x, i) => {
        s += item(letras[i], x.texto, { sb: i ? 200 : 0 });
        s += para('', { sa: 40 });
        const pal = [...String(x.palavra || '').toUpperCase()];
        const dicas = {}; const gaps = [];
        pal.forEach((ch, k) => { if (ch === ' ') gaps.push(k + 1); });
        (x.dicas || []).forEach(k => { if (pal[k - 1]) dicas[k] = pal[k - 1]; });
        s += letterBoxes(pal.length, dicas);
      });
      break;
    default:
      it.forEach((x, i) => { s += item(letras[i], x.texto || '', { sb: i ? 120 : 0 }); });
  }
  return s;
}

export function provaRTF(prova) {
  let s = cabecalho(prova.titulo || 'Avaliação');
  if (prova.abertura) s += para(run(prova.abertura, { font: 'comic', i: true, size: 11 }), { align: 'center', sb: 160, sa: 0 });
  (prova.questoes || []).forEach((Q, i) => { s += renderQuestao(i + 1, Q); });
  return doc(s, { barra: true });
}

export function gabaritoRTF(prova) {
  let s = para(run(`Gabarito – ${prova.titulo || ''}`, { font: 'comic', b: true, u: true, size: 14 }), { align: 'center', sa: 80 });
  s += para(run('Uso da professora. Entre colchetes, a página da apostila.', { i: true, size: 10 }), { align: 'center', sa: 200 });
  (prova.questoes || []).forEach((Q, i) => {
    s += para([run(`Questão ${i + 1}  `, { b: true }), run(`(${Q.pontuacao || Q.pontos || ''})`, { size: 10 })], { sb: 200, sa: 40, keepn: true });
    if (Q.tipo === 'cruzadinha') {
      const cw = montarCruzadinha(Q.palavras || []);
      (cw?.itens || []).forEach(p => { s += para(run(`${p.n} ${p.d === 'H' ? '\u2192' : '\u2193'} ${p.original.toUpperCase()}`), { sa: 20, li: 360 }); });
    }
    (Q.gabarito || []).forEach(l => { s += para(run(l), { sa: 20, li: 360 }); });
  });
  const total = (prova.questoes || []).reduce((a, Q) => a + (parseFloat(String(Q.pontos || '0').replace(',', '.')) || 0), 0);
  s += para(run(`Total: ${total.toFixed(1).replace('.', ',')} pontos`, { b: true }), { sb: 300 });
  if (prova.fora_da_prova) s += para(run(prova.fora_da_prova, { i: true, size: 9 }), { sb: 200 });
  return doc(s, { ml: 1000, mr: 1000, mt: 900, mb: 900 });
}

// ---------- fichas de revisão (8 por folha) ----------
export function fichasRTF(rev, meta) {
  const M = 500, COLW = Math.floor((PAGE_W - 2 * M) / 2), ROWH = 3930;
  const fichas = rev.fichas || [];
  const ficha = (f, n) => [
    cellP([logo(750, 510), run(`   Revisão de ${meta.materia} – ${meta.turma}`, { font: 'comic', b: true, size: 10 })], { sa: 20 }),
    cellP(run(`Ficha ${n} · ${f.tema || ''}`, { b: true, size: 9.5 }), { sa: 40 }),
    cellP(run('Nome: ______________________________   Data: ___/___', { size: 9 }), { sa: 60 }),
    cellP(run(rev.comando || 'Responda em seu caderno:', { b: true, size: 10 }), { sa: 60 }),
    ...(f.perguntas || []).map((p, i) => cellP(run(`${letras[i]}) ${p.texto}`, { size: 10 }), { sa: 70, li: 260, fi: -260 })),
  ];
  let s = '';
  for (let i = 0; i < fichas.length; i += 2) {
    s += row([0, 1].map(k => ({ w: COLW, b: 'dash', content: fichas[i + k] ? ficha(fichas[i + k], i + k + 1) : [cellP('', { sa: 0 })] })), { h: ROWH, exact: true, pad: 170, padv: 120 });
  }
  return doc(s, { ml: M, mr: M, mt: M, mb: 200 });
}
export function gabaritoFichasRTF(rev, meta) {
  let s = para(run(`Gabarito – Revisões de ${meta.materia} – ${meta.turma}`, { font: 'comic', b: true, size: 14 }), { align: 'center', sa: 80 });
  s += para(run('Uso da professora. Entre colchetes, a página da apostila. Aceitar respostas com as palavras do aluno.', { i: true, size: 9.5 }), { align: 'center', sa: 160 });
  (rev.fichas || []).forEach((f, i) => {
    s += para(run(`Ficha ${i + 1} · ${f.tema || ''}`, { b: true, size: 10.5 }), { sb: 160, sa: 40, keepn: true });
    (f.perguntas || []).forEach((p, j) => { s += para(run(`${letras[j]}) ${p.resposta || ''}`, { size: 10 }), { sa: 20, li: 360 }); });
  });
  return doc(s, { ml: 1000, mr: 1000, mt: 800, mb: 800 });
}
