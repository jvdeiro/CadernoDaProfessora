import Link from 'next/link';
import { contexto, dataBR, cor } from '@/lib/dados';
import { ItemLink, SemAcesso, Vazio, Voltar, STATUS } from '@/components/UI';
import Icone from '@/components/Icone';

export const dynamic = 'force-dynamic';

export default async function Turma({ params }) {
  const { id } = await params;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const [{ data: t }, { data: conteudos }, { data: provas }, { data: aulas }, { data: materiais }] = await Promise.all([
    sb.from('turmas').select('*').eq('id', id).single(),
    sb.from('conteudos').select('id,titulo,status,updated_at,materias(nome,cor),paginas(count)').eq('turma_id', id).order('created_at', { ascending: false }),
    sb.from('avaliacoes').select('id,nome,data,status,materias(nome,cor)').eq('turma_id', id).order('created_at', { ascending: false }),
    sb.from('aulas').select('id,data,tema,materias(nome,cor)').eq('turma_id', id).order('data', { ascending: false }).limit(8),
    sb.from('materiais').select('id,titulo,tipo,materias(nome,cor)').eq('turma_id', id).order('created_at', { ascending: false }),
  ]);
  if (!t) return <Vazio titulo="Turma não encontrada" />;
  return (
    <>
      <Voltar href="/turmas">Turmas</Voltar>
      <h1><span className={`hl ${t.cor}`}>{t.nome}</span></h1>
      {t.idade && <p className="suave">Crianças de {t.idade} anos</p>}
      <div className="botoes">
        <Link className="botao pastel" style={{ '--c': 'var(--verde)' }} href={`/avaliacoes/nova?turma=${t.id}`}><Icone n="provas" style={{ width: 20 }} />Nova prova</Link>
        <Link className="botao pastel" style={{ '--c': 'var(--pessego)' }} href={`/conteudos/novo?turma=${t.id}`}><Icone n="camera" style={{ width: 20 }} />Mandar apostila</Link>
      </div>

      <h2>Conteúdos <span className="suave pequeno" style={{ fontFamily: 'var(--f-texto)' }}>(apostilas)</span></h2>
      {conteudos?.length ? <ul className="lista">{conteudos.map(c => (
        <ItemLink key={c.id} href={`/conteudos/${c.id}`} titulo={c.titulo} sub={`${c.paginas?.[0]?.count || 0} páginas · ${c.status === 'pronto' ? 'resumo pronto' : 'em preparo'}`} etq={c.materias?.nome} etqCor={cor(c.materias?.cor)} />
      ))}</ul> : <Vazio titulo="Nenhum conteúdo ainda">Mande as fotos da apostila para o sistema ler.</Vazio>}

      <h2>Provas</h2>
      {provas?.length ? <ul className="lista">{provas.map(p => (
        <ItemLink key={p.id} href={`/avaliacoes/${p.id}`} titulo={`${p.nome} de ${p.materias?.nome || ''}`} sub={`${p.data ? dataBR(p.data) + ' · ' : ''}${STATUS[p.status]?.t || ''}`} etq={p.materias?.nome} etqCor={cor(p.materias?.cor)} />
      ))}</ul> : <Vazio titulo="Nenhuma prova ainda" />}

      <h2>Aulas</h2>
      {aulas?.length ? <ul className="lista">{aulas.map(a => (
        <ItemLink key={a.id} href={`/aulas?editar=${a.id}`} titulo={a.tema || 'Aula'} sub={dataBR(a.data)} etq={a.materias?.nome} etqCor={cor(a.materias?.cor)} />
      ))}</ul> : <Vazio titulo="Nenhuma aula anotada" />}

      {materiais?.length > 0 && <>
        <h2>Materiais guardados</h2>
        <ul className="lista">{materiais.map(m => (
          <li key={m.id}><a className="item-link" href={`/api/materiais/${m.id}`}><Icone n="baixar" style={{ width: 22 }} /><div><div className="tit" style={{ fontSize: '1.15rem' }}>{m.titulo}</div><div className="sub">{m.materias?.nome}</div></div></a></li>
        ))}</ul>
      </>}
    </>
  );
}
