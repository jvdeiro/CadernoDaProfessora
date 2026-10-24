import Link from 'next/link';
import { contexto, dataBR, dataLonga, cor } from '@/lib/dados';
import { ItemLink, SemAcesso, Vazio, STATUS } from '@/components/UI';
import Icone from '@/components/Icone';
import Personagem from '@/components/Personagem';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: provas }, { data: aulas }, { data: turmas }] = await Promise.all([
    sb.from('avaliacoes').select('id,nome,data,status,turmas(nome),materias(nome,cor)').neq('status', 'historico').order('data', { ascending: true, nullsFirst: false }).limit(6),
    sb.from('aulas').select('id,data,tema,feita,turmas(nome),materias(nome,cor)').gte('data', hoje).order('data').limit(5),
    sb.from('turmas').select('id,nome,cor').order('ano'),
  ]);
  const nome = membro.nome || 'Professora';
  return (
    <>
      <p className="eyebrow">{dataLonga(hoje)}</p>
      <h1>Olá, <span className="hl">{nome}</span>!</h1>
      <Personagem />

      <div className="grade-acoes">
        <Link href="/avaliacoes/nova" className="acao principal" style={{ '--c': 'var(--verde)' }}><small>Avaliação</small><Icone n="provas" className="ic" /><b><em>Nova prova</em></b><span>Prova, gabarito e revisões</span></Link>
        <Link href="/conteudos/novo" className="acao" style={{ '--c': 'var(--pessego)' }}><small>Conteúdo</small><Icone n="camera" className="ic" /><b><em>Mandar apostila</em></b><span>Fotos ou prints das páginas</span></Link>
        <Link href="/aulas?nova=1" className="acao" style={{ '--c': 'var(--lilas)' }}><small>Agenda</small><Icone n="calendario" className="ic" /><b><em>Planejar aula</em></b><span>Data, tema e anotações</span></Link>
        <Link href="/turmas" className="acao" style={{ '--c': 'var(--amarelo)' }}><small>Turmas</small><Icone n="turmas" className="ic" /><b><em>Minhas turmas</em></b><span>Conteúdos e materiais</span></Link>
      </div>

      <h2 className="faixa" style={{ '--hl': 'var(--verde)' }}>Provas em andamento</h2>
      {provas?.length ? (
        <ul className="lista">
          {provas.map(p => (
            <ItemLink key={p.id} href={`/avaliacoes/${p.id}`} titulo={`${p.nome} de ${p.materias?.nome || ''}`} sub={`${p.turmas?.nome || ''}${p.data ? ' · ' + dataBR(p.data) : ''}`} etq={STATUS[p.status]?.t} etqCor={STATUS[p.status]?.c} />
          ))}
        </ul>
      ) : <Vazio titulo="Nenhuma prova em andamento">Toque em “Nova prova” para começar.</Vazio>}

      <h2 className="faixa" style={{ '--hl': 'var(--lilas)' }}>Próximas aulas</h2>
      {aulas?.length ? (
        <ul className="lista">
          {aulas.map(a => (
            <ItemLink key={a.id} href={`/aulas?editar=${a.id}`} titulo={a.tema || 'Aula'} sub={`${dataBR(a.data)} · ${a.turmas?.nome || ''} · ${a.materias?.nome || ''}`} etq={a.materias?.nome} etqCor={cor(a.materias?.cor)} />
          ))}
        </ul>
      ) : <Vazio titulo="Nenhuma aula marcada">Use “Planejar aula” para anotar as próximas.</Vazio>}

      <h2 className="faixa">Turmas</h2>
      <ul className="lista">
        {(turmas || []).map(t => <ItemLink key={t.id} href={`/turmas/${t.id}`} titulo={t.nome} />)}
      </ul>
    </>
  );
}
