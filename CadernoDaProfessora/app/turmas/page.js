import { contexto, CORES } from '@/lib/dados';
import { ItemLink, SemAcesso } from '@/components/UI';
import { criarTurma } from '@/app/acoes';

export const dynamic = 'force-dynamic';

export default async function Turmas() {
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const { data: turmas } = await sb.from('turmas').select('id,nome,idade,cor').order('ano');
  return (
    <>
      <h1>Minhas <span className="hl amarelo">turmas</span></h1>
      <ul className="lista">
        {(turmas || []).map(t => <ItemLink key={t.id} href={`/turmas/${t.id}`} titulo={t.nome} sub={t.idade ? `Crianças de ${t.idade} anos` : null} />)}
      </ul>
      <details className="dobra">
        <summary>Adicionar turma</summary>
        <form action={criarTurma} style={{ paddingTop: 8 }}>
          <label className="campo"><span>Ano</span><input name="ano" type="number" min="1" max="9" inputMode="numeric" placeholder="Ex.: 3" required /></label>
          <label className="campo"><span>Nome da turma</span><input name="nome" placeholder="Ex.: 3º ano" /><small>Se deixar em branco, fica “3º ano”.</small></label>
          <label className="campo"><span>Idade das crianças</span><input name="idade" type="number" inputMode="numeric" placeholder="Ex.: 8" /></label>
          <div className="campo"><span>Cor</span><div className="escolhas">{CORES.map((c, i) => <label key={c} className="escolha" style={{ '--c': `var(--${c})` }}><input type="radio" name="cor" value={c} defaultChecked={!i} /><span>{c}</span></label>)}</div></div>
          <button className="botao">Salvar turma</button>
        </form>
      </details>
    </>
  );
}
