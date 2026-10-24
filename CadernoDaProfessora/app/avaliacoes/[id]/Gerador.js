'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icone from '@/components/Icone';
import Avisos, { inscreverAvisos } from '@/components/Avisos';
import { createClient } from '@/lib/supabase/client';
import { postPersistente } from '@/lib/persistente';
import { Selo, useAtualizacao } from '@/components/Acompanhar';

const SEG_POR_LOTE = 70;   // cada lote: um pedido pequeno à IA
const LOTES_ESTIMADOS = 5; // 10 questões / 2 por lote, enquanto o plano não chega
const tempoRestante = seg => seg < 60 ? 'menos de 1 min' : `cerca de ${Math.round(seg / 60)} min`;

const TXT = {
  prova: { criar: 'Criar a prova', criando: 'Escrevendo a prova e o gabarito…', corrigindo: 'Conferindo e corrigindo a prova…', refazer: 'Fazer outra prova do zero', ok: 'Conferido: a soma dá 10,0 e nenhuma questão entrega a resposta de outra.', ex: 'Ex.: troque a questão 3 por uma cruzadinha; deixe a prova mais curta; a questão 5 está difícil.' },
  revisoes: { criar: 'Criar as revisões', criando: 'Escrevendo as 8 fichas de revisão…', corrigindo: 'Tirando das fichas o que lembra a prova…', refazer: 'Fazer outras revisões do zero', ok: 'Conferido: nenhuma resposta, alternativa ou palavra-chave da prova aparece nas revisões.', ex: 'Ex.: deixe as perguntas mais curtas; troque a ficha 2 por uma sobre o café.' },
};

export default function Gerador({ id, tipo, existe, bloqueado, checagem, processandoInicial }) {
  const t = TXT[tipo];
  const [fase, setFase] = useState('');
  const [erro, setErro] = useState('');
  const [ajuste, setAjuste] = useState('');
  const router = useRouter();

  const [espera, setEspera] = useState(0);
  const [fila, setFila] = useState(!!processandoInicial);  // criando no servidor, em etapas
  const [prog, setProg] = useState(null);                   // { feitas, total, etapa }
  const sb = createClient();
  const chamar = body => postPersistente(`/api/avaliacoes/${id}/${tipo}`, body, { aoEsperar: setEspera });

  // Acompanha o robô do servidor: dá para fechar o app, o trabalho continua e o progresso fica salvo.
  const acompanhar = useCallback(async () => {
    const { data, error } = await sb.from('avaliacoes').select('processando,geracao').eq('id', id).single();
    if (error) throw new Error('falha');
    if (!data) return;
    setProg(data.geracao ? { feitas: data.geracao.feitas || 0, total: data.geracao.total || null, temPlano: !!data.geracao.plano } : null);
    if (data.processando !== tipo) { setFila(false); router.refresh(); }
  }, [id, tipo]);

  const sinc = useAtualizacao(acompanhar, fila); // atualiza sozinho e alimenta o selo

  async function rodar(body) {
    setErro(''); setFase('criando');
    try {
      let j = await chamar(body);
      if (j.enfileirado) { inscreverAvisos().catch(() => {}); setFila(true); setProg(null); setFase(''); return; }
      for (let i = 0; i < 2 && j.ok === false; i++) { setFase('corrigindo'); j = await chamar({ corrigir: true }); }
      setAjuste('');
      router.refresh();
    } catch (e) { setErro(e.message); }
    setFase('');
  }

  if (fila) {
    const ehProva = tipo === 'prova';
    const totalLotes = prog?.total || LOTES_ESTIMADOS;
    const faltam = prog?.total ? Math.max(0, prog.total - prog.feitas) : LOTES_ESTIMADOS;
    // % do trabalho todo: o plano conta como uma etapa, cada lote como outra
    const unidades = 1 + totalLotes;
    const concluidas = (prog?.temPlano ? 1 : 0) + (prog?.feitas || 0);
    const pct = Math.min(99, Math.round((concluidas / unidades) * 100));
    const agora = !prog?.temPlano
      ? (ehProva ? 'Escolhendo os assuntos e os tipos das 10 questões' : 'Escolhendo os temas das 8 fichas')
      : prog?.total
        ? `${ehProva ? 'Escrevendo as questões' : 'Escrevendo as fichas'} — lote ${Math.min(prog.feitas + 1, prog.total)} de ${prog.total}`
        : (ehProva ? 'Escrevendo as primeiras questões' : 'Escrevendo as primeiras fichas');
    return (
      <div className="carregando acompanhamento" role="status" aria-live="polite">
        <Icone n="lapis" className="lapis" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{ehProva ? 'Criando a prova e o gabarito' : 'Criando as 8 fichas de revisão'}</b>
          <span className="agora">{agora}</span>
          <div className="progresso"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
          <div className="linha-pct">
            <span className="pequeno">Tempo restante estimado: <b>{tempoRestante(faltam * SEG_POR_LOTE + (prog?.temPlano ? 0 : 60))}</b></span>
            <span className="pct">{pct}%</span>
          </div>
          <Avisos />
        </div>
        <Selo estado={sinc.estado} info={sinc.info} oQue={`${ehProva ? 'A prova' : 'As revisões'} continuam sendo escritas no servidor mesmo assim.`} />
      </div>
    );
  }

  if (fase) return (
    <div className="carregando" role="status" aria-live="polite">
      <Icone n="lapis" className="lapis" />
      <div><b>{fase === 'criando' ? t.criando : t.corrigindo}</b><div className="pequeno">Leva de 1 a 3 minutos. Deixe esta tela aberta.</div>
        {espera > 0 && <div className="pequeno" style={{ marginTop: 6 }}>Todas as IAs gratuitas estão ocupadas agora. Tentando de novo em {espera} s, sozinho.</div>}</div>
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
