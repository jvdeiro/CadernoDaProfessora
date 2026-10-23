import { contexto, dataBR, cor } from '@/lib/dados';
import { SemAcesso, Vazio } from '@/components/UI';
import { salvarAula, marcarAula, apagarAula } from '@/app/acoes';

export const dynamic = 'force-dynamic';

export default async function Aulas({ searchParams }) {
  const sp = await searchParams;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const [{ data: aulas }, { data: turmas }, { data: materias }] = await Promise.all([
    sb.from('aulas').select('*,turmas(nome,cor),materias(nome,cor)').order('data', { ascending: true }),
    sb.from('turmas').select('id,nome,cor').order('ano'),
    sb.from('materias').select('id,nome,cor').order('nome'),
  ]);
  const hoje = new Date().toISOString().slice(0, 10);
  const editando = sp.editar ? (aulas || []).find(a => a.id === sp.editar) : null;
  const proximas = (aulas || []).filter(a => !a.data || a.data >= hoje);
  const passadas = (aulas || []).filter(a => a.data && a.data < hoje).reverse();
  const Cartao = ({ a }) => (
    <li style={{ padding: '14px 2px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <form action={marcarAula}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="feita" value={a.feita ? '0' : '1'} />
          <button aria-label={a.feita ? 'Marcar como não dada' : 'Marcar como dada'} style={{ width: 30, height: 30, borderRadius: 8, border: '2px solid var(--tinta)', background: a.feita ? 'var(--verde)' : '#fffdf7', fontWeight: 700, marginTop: 2 }}>{a.feita ? '✓' : ''}</button></form>
        <a href={`/aulas?editar=${a.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
          <div className="mao" style={{ fontSize: '1.3rem', textDecoration: a.feita ? 'line-through' : 'none' }}>{a.tema || 'Aula'}</div>
          <div className="pequeno suave">{dataBR(a.data)} · {a.turmas?.nome} {a.materias && <span className="etq" style={{ '--c': cor(a.materias.cor) }}>{a.materias.nome}</span>}</div>
          {a.anotacoes && <p className="pequeno" style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{a.anotacoes}</p>}
        </a>
      </div>
    </li>
  );
  return (
    <>
      <h1>Minhas <span className="hl lilas">aulas</span></h1>
      <details className="dobra" open={!!sp.nova || !!editando}>
        <summary>{editando ? 'Editar aula' : 'Planejar uma aula'}</summary>
        <form action={salvarAula}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <label className="campo"><span>Dia</span><input type="date" name="data" defaultValue={editando?.data || ''} required /></label>
          <div className="campo"><span>Turma</span><div className="escolhas">{turmas.map((t, i) => <label key={t.id} className="escolha" style={{ '--c': cor(t.cor) }}><input type="radio" name="turma_id" value={t.id} defaultChecked={editando ? editando.turma_id === t.id : i === 0} /><span>{t.nome}</span></label>)}</div></div>
          <div className="campo"><span>Matéria</span><div className="escolhas">{materias.map(m => <label key={m.id} className="escolha" style={{ '--c': cor(m.cor) }}><input type="radio" name="materia_id" value={m.id} defaultChecked={editando?.materia_id === m.id} /><span>{m.nome}</span></label>)}</div></div>
          <label className="campo"><span>Tema da aula</span><input name="tema" defaultValue={editando?.tema || ''} placeholder="Ex.: Período Regencial" /></label>
          <label className="campo"><span>Anotações</span><textarea name="anotacoes" defaultValue={editando?.anotacoes || ''} placeholder="Ex.: ler p. 7 juntos, fazer a atividade da p. 8, levar mapa." /></label>
          <div className="botoes"><button className="botao">Salvar aula</button>{editando && <a className="botao claro" href="/aulas">Cancelar</a>}</div>
        </form>
        {editando && <form action={apagarAula}><input type="hidden" name="id" value={editando.id} /><button className="link-btn" style={{ color: 'var(--perigo)' }}>Apagar esta aula</button></form>}
      </details>
      <h2>Próximas</h2>
      {proximas.length ? <ul className="lista">{proximas.map(a => <Cartao key={a.id} a={a} />)}</ul> : <Vazio titulo="Nada planejado ainda" />}
      {passadas.length > 0 && <><h2>Já foram</h2><ul className="lista">{passadas.slice(0, 20).map(a => <Cartao key={a.id} a={a} />)}</ul></>}
    </>
  );
}
