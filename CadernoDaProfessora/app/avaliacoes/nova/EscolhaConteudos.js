'use client';
import { useState } from 'react';
const cor = c => `var(--${c || 'amarelo'})`;
export default function EscolhaConteudos({ turmas, materias, conteudos, turmaInicial, materiaInicial, marcados = [] }) {
  const [t, setT] = useState(turmaInicial || turmas[0]?.id);
  const [m, setM] = useState(materiaInicial || '');
  const lista = conteudos.filter(c => c.turma_id === t && (!m || c.materia_id === m));
  return (
    <>
      <div className="campo"><span>Turma</span><div className="escolhas">{turmas.map(x => (
        <label key={x.id} className="escolha" style={{ '--c': cor(x.cor) }}><input type="radio" name="turma_id" value={x.id} checked={t === x.id} onChange={() => setT(x.id)} required /><span>{x.nome}</span></label>))}</div></div>
      <div className="campo"><span>Matéria</span><div className="escolhas">{materias.map(x => (
        <label key={x.id} className="escolha" style={{ '--c': cor(x.cor) }}><input type="radio" name="materia_id" value={x.id} checked={m === x.id} onChange={() => setM(x.id)} required /><span>{x.nome}</span></label>))}</div></div>
      <div className="campo"><span>Conteúdo que cai na prova</span>
        {lista.length ? lista.map(c => (
          <label key={c.id} className="check"><input type="checkbox" name="conteudos" value={c.id} defaultChecked={marcados.includes(c.id) || (!marcados.length && lista.length === 1)} />
            <span>{c.titulo}{c.status !== 'pronto' && <span className="etq" style={{ '--c': 'var(--pessego)', marginLeft: 8 }}>resumo não terminado</span>}</span></label>
        )) : <small>{m ? 'Ainda não há conteúdo desta turma e matéria. Dá para criar a prova agora e escolher o conteúdo depois.' : 'Escolha a matéria para ver os conteúdos.'}</small>}
      </div>
    </>
  );
}
