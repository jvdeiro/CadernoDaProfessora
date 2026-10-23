'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icone from '@/components/Icone';

const TXT = {
  prova: { criar: 'Criar a prova', criando: 'Escrevendo a prova e o gabarito…', corrigindo: 'Conferindo e corrigindo a prova…', refazer: 'Fazer outra prova do zero', ok: 'Conferido: a soma dá 10,0 e nenhuma questão entrega a resposta de outra.', ex: 'Ex.: troque a questão 3 por uma cruzadinha; deixe a prova mais curta; a questão 5 está difícil.' },
  revisoes: { criar: 'Criar as revisões', criando: 'Escrevendo as 8 fichas de revisão…', corrigindo: 'Tirando das fichas o que lembra a prova…', refazer: 'Fazer outras revisões do zero', ok: 'Conferido: nenhuma resposta, alternativa ou palavra-chave da prova aparece nas revisões.', ex: 'Ex.: deixe as perguntas mais curtas; troque a ficha 2 por uma sobre o café.' },
};

export default function Gerador({ id, tipo, existe, bloqueado, checagem }) {
  const t = TXT[tipo];
  const [fase, setFase] = useState('');
  const [erro, setErro] = useState('');
  const [ajuste, setAjuste] = useState('');
  const router = useRouter();

  async function chamar(body) {
    const r = await fetch(`/api/avaliacoes/${id}/${tipo}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) throw new Error(j.erro || 'Demorou demais ou deu erro. Tente de novo.');
    return j;
  }
  async function rodar(body) {
    setErro(''); setFase('criando');
    try {
      let j = await chamar(body);
      for (let i = 0; i < 2 && j.ok === false; i++) { setFase('corrigindo'); j = await chamar({ corrigir: true }); }
      setAjuste('');
      router.refresh();
    } catch (e) { setErro(e.message); }
    setFase('');
  }

  if (fase) return (
    <div className="carregando" role="status" aria-live="polite">
      <Icone n="lapis" className="lapis" />
      <div><b>{fase === 'criando' ? t.criando : t.corrigindo}</b><div className="pequeno">Leva de 1 a 3 minutos. Deixe esta tela aberta.</div></div>
    </div>
  );
  return (
    <div>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      {!existe && <button className="botao cheio" disabled={bloqueado} onClick={() => rodar({})}>{t.criar}</button>}
      {!existe && bloqueado && <p className="suave pequeno" style={{ marginTop: 8 }}>{tipo === 'prova' ? 'Primeiro escolha um conteúdo com o resumo pronto.' : 'Primeiro crie a prova.'}</p>}
      {existe && checagem && (checagem.ok
        ? <p className="aviso ok">✓ {t.ok}</p>
        : <div className="aviso"><b>A conferência automática ainda achou isto:</b><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{checagem.problemas.map((p, i) => <li key={i}>{p}</li>)}</ul>
            <button className="botao pequeno" style={{ marginTop: 10 }} onClick={() => rodar({ corrigir: true })}>Corrigir agora</button></div>)}
      {existe && (
        <details className="dobra">
          <summary>Pedir uma mudança</summary>
          <label className="campo"><span className="sr">O que mudar</span>
            <textarea value={ajuste} onChange={e => setAjuste(e.target.value)} placeholder={t.ex} />
          </label>
          <div className="botoes">
            <button className="botao" disabled={!ajuste.trim()} onClick={() => rodar({ ajuste })}>Fazer a mudança</button>
            <button className="botao claro" onClick={() => { if (window.confirm('Fazer tudo de novo do zero?')) rodar({}); }}><Icone n="refazer" style={{ width: 18 }} />{t.refazer}</button>
          </div>
        </details>
      )}
    </div>
  );
}
