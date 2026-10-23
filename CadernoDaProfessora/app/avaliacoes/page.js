import Link from 'next/link';
import { contexto, dataBR, cor } from '@/lib/dados';
import { ItemLink, SemAcesso, Vazio, STATUS } from '@/components/UI';

export const dynamic = 'force-dynamic';

export default async function Avaliacoes() {
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const { data: avs } = await sb.from('avaliacoes').select('id,nome,data,status,turmas(nome),materias(nome,cor)').order('created_at', { ascending: false });
  return (
    <>
      <h1>Provas e <span className="hl verde">revisões</span></h1>
      <Link href="/avaliacoes/nova" className="botao cheio" style={{ margin: '8px 0 18px' }}>+ Nova prova</Link>
      {avs?.length ? <ul className="lista">{avs.map(a => (
        <ItemLink key={a.id} href={`/avaliacoes/${a.id}`} titulo={`${a.nome} de ${a.materias?.nome || ''}`} sub={`${a.turmas?.nome || ''}${a.data ? ' · ' + dataBR(a.data) : ''} · ${STATUS[a.status]?.t || ''}`} etq={a.materias?.nome} etqCor={cor(a.materias?.cor)} />
      ))}</ul> : <Vazio titulo="Nenhuma prova ainda" />}
    </>
  );
}
