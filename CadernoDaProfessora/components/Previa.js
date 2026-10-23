// Mostra na tela a prova e as fichas a partir do mesmo JSON que gera o .doc
import { montarCruzadinha } from '@/lib/crossword';

const L = 'abcdefghijklmnop';
const Lac = ({ n = 16 }) => <span className="lacuna" style={{ minWidth: n * 6 }}>&nbsp;</span>;
const Linha = () => <div style={{ borderBottom: '1px solid #000', height: 22 }} />;

function Grade({ palavras }) {
  const cw = montarCruzadinha(palavras || []);
  if (!cw) return <p><i>[Cruzadinha não montou]</i></p>;
  const g = Array.from({ length: cw.H }, () => Array(cw.W).fill(null));
  for (const p of cw.itens) for (let i = 0; i < p.palavra.length; i++) {
    const r = p.d === 'V' ? p.r + i : p.r, c = p.d === 'H' ? p.c + i : p.c;
    g[r][c] = g[r][c] || { n: '' };
    if (i === 0) g[r][c].n = g[r][c].n && g[r][c].n !== String(p.n) ? g[r][c].n + '/' + p.n : String(p.n);
  }
  return (
    <>
      <table className="grade"><tbody>{g.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className={c ? 'on' : ''}>{c?.n}</td>)}</tr>)}</tbody></table>
      {cw.itens.map((p, i) => <p key={i} style={{ margin: '2px 0 2px 10px' }}><b>{p.n}.</b> ({p.d === 'H' ? '→' : '↓'}) {p.pista}</p>)}
    </>
  );
}

function Questao({ n, Q }) {
  const it = Q.itens || [];
  return (
    <div>
      <p className="q">{n}. {Q.enunciado} ({Q.pontos})</p>
      {Q.tipo === 'pinte' && it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) {x.texto}</p><div className="opcoes">{(x.opcoes || []).map((o, k) => <span key={k}>{o}</span>)}</div></div>)}
      {Q.tipo === 'assinale' && it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) {x.texto}</p>{(x.opcoes || []).map((o, k) => <p key={k} style={{ margin: '0 0 0 4px' }}>(&nbsp;&nbsp;&nbsp;) {o}</p>)}</div>)}
      {['vf', 'marque_x', 'letras'].includes(Q.tipo) && it.map((x, i) => <p key={i} style={{ margin: '3px 0' }}>(&nbsp;&nbsp;&nbsp;) {x.texto}</p>)}
      {['complete_quadro', 'adivinhe'].includes(Q.tipo) && Q.quadro?.length > 0 && <div className="quadro">{Q.quadro.join('   ')}</div>}
      {['complete_quadro', 'complete'].includes(Q.tipo) && it.map((x, i) => <p key={i} style={{ margin: '6px 0', lineHeight: 1.7 }}>{L[i]}) {x.antes}<Lac />{x.depois}</p>)}
      {Q.tipo === 'numere' && <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{(Q.colunaA || []).map((a, i) => <tr key={i}><td style={{ fontWeight: 700, width: '38%', padding: '3px 0' }}>({i + 1}) {a}</td><td style={{ padding: '3px 0' }}>(&nbsp;&nbsp;&nbsp;) {it[i]?.texto}</td></tr>)}</tbody></table>}
      {Q.tipo === 'adivinhe' && it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) {x.texto}</p><p style={{ margin: 0 }}><b>Quem sou eu?</b> <Lac n={30} /></p></div>)}
      {Q.tipo === 'responda' && it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) {x.texto}</p>{Array.from({ length: x.linhas || 1 }, (_, k) => <Linha key={k} />)}</div>)}
      {Q.tipo === 'defina' && it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) "{x.antes}<b><u>{x.palavra}</u></b>{x.depois}"</p>{Array.from({ length: x.linhas || 2 }, (_, k) => <Linha key={k} />)}</div>)}
      {Q.tipo === 'texto' && <><div className="caixa-txt">{Q.texto}</div>{it.map((x, i) => <div key={i}><p style={{ margin: '6px 0 2px' }}>{L[i]}) {x.texto}</p>{Array.from({ length: x.linhas || 1 }, (_, k) => <Linha key={k} />)}</div>)}</>}
      {Q.tipo === 'cruzadinha' && <Grade palavras={Q.palavras} />}
      {Q.tipo === 'quadrinhos' && it.map((x, i) => {
        const pal = [...String(x.palavra || '').toUpperCase()];
        return <div key={i}><p style={{ margin: '6px 0 4px' }}>{L[i]}) {x.texto}</p><div style={{ marginLeft: 8 }}>{pal.map((ch, k) => <span key={k} className="lt">{(x.dicas || []).includes(k + 1) ? ch : ''}</span>)}</div></div>;
      })}
    </div>
  );
}

export function PreviaProva({ prova }) {
  return (
    <div className="a4">
      <p style={{ textAlign: 'center', fontFamily: "'Comic Sans MS', cursive", fontWeight: 700, textDecoration: 'underline', margin: '0 0 6px' }}>{prova.titulo}</p>
      {prova.abertura && <p className="ab">{prova.abertura}</p>}
      {(prova.questoes || []).map((Q, i) => <Questao key={i} n={i + 1} Q={Q} />)}
    </div>
  );
}
export function PreviaGabarito({ prova }) {
  return (
    <div className="a4">
      {(prova.questoes || []).map((Q, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 2px' }}><b>Questão {i + 1}</b> <small>({Q.pontuacao || Q.pontos})</small></p>
          {Q.tipo === 'cruzadinha' && (montarCruzadinha(Q.palavras || [])?.itens || []).map((p, k) => <p key={k} style={{ margin: '0 0 0 14px' }}>{p.n} {p.d === 'H' ? '→' : '↓'} {p.original.toUpperCase()}</p>)}
          {(Q.gabarito || []).map((g, k) => <p key={k} style={{ margin: '0 0 0 14px' }}>{g}</p>)}
        </div>
      ))}
      {prova.fora_da_prova && <p style={{ fontSize: '.85em', fontStyle: 'italic' }}>{prova.fora_da_prova}</p>}
    </div>
  );
}
export function PreviaFichas({ rev, comRespostas }) {
  return (
    <div>
      {(rev.fichas || []).map((f, i) => (
        <div key={i} className="ficha-prev">
          <b>Ficha {i + 1} · {f.tema}</b>
          <p className="pequeno" style={{ margin: '0 0 4px', fontWeight: 700 }}>{rev.comando || 'Responda em seu caderno:'}</p>
          <ol type="a">{(f.perguntas || []).map((p, j) => <li key={j}>{p.texto}{comRespostas && <span className="resp">{p.resposta}</span>}</li>)}</ol>
        </div>
      ))}
    </div>
  );
}
