import { contexto, cor } from '@/lib/dados';
import { SemAcesso, Voltar } from '@/components/UI';
import { criarConteudo } from '@/app/acoes';

export const dynamic = 'force-dynamic';

export default async function NovoConteudo({ searchParams }) {
  const sp = await searchParams;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const [{ data: turmas }, { data: materias }] = await Promise.all([
    sb.from('turmas').select('id,nome,cor').order('ano'), sb.from('materias').select('id,nome,cor').order('nome'),
  ]);
  return (
    <>
      <Voltar href={sp.turma ? `/turmas/${sp.turma}` : '/'} />
      <h1>Mandar <span className="hl pessego">apostila</span></h1>
      <p className="suave">Primeiro diga de que turma e matéria é o material. Na próxima tela você manda as fotos ou os prints das páginas.</p>
      <form action={criarConteudo}>
        <div className="campo"><span>Turma</span><div className="escolhas">{turmas.map((t, i) => (
          <label key={t.id} className="escolha" style={{ '--c': cor(t.cor) }}><input type="radio" name="turma_id" value={t.id} required defaultChecked={sp.turma ? sp.turma === t.id : i === 0} /><span>{t.nome}</span></label>))}</div></div>
        <div className="campo"><span>Matéria</span><div className="escolhas">{materias.map(m => (
          <label key={m.id} className="escolha" style={{ '--c': cor(m.cor) }}><input type="radio" name="materia_id" value={m.id} required defaultChecked={sp.materia === m.id} /><span>{m.nome}</span></label>))}</div>
          <small>Falta alguma matéria? Adicione em “Mais”.</small></div>
        <label className="campo"><span>Nome do conteúdo</span><input name="titulo" placeholder="Ex.: Brasil Império e República" required /></label>
        <label className="campo"><span>Algum recado sobre as páginas? (opcional)</span>
          <textarea name="descricao" placeholder="Ex.: Apostila digital, só da página 62 até a 75. As fotos de outra matéria podem ser ignoradas." />
        </label>
        <button className="botao cheio">Continuar e mandar as fotos</button>
      </form>
    </>
  );
}
