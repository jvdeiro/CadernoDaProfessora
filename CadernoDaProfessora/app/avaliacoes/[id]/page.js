import Link from 'next/link';
import { contexto, dataBR, cor } from '@/lib/dados';
import { SemAcesso, Voltar, Vazio } from '@/components/UI';
import { PreviaProva, PreviaGabarito, PreviaFichas } from '@/components/Previa';
import { salvarAvaliacao, apagarAvaliacao } from '@/app/acoes';
import EscolhaConteudos from '../nova/EscolhaConteudos';
import Gerador from './Gerador';
import Icone from '@/components/Icone';

export const dynamic = 'force-dynamic';

export default async function Avaliacao({ params }) {
  const { id } = await params;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const { data: av } = await sb.from('avaliacoes').select('*,turmas(id,nome,cor),materias(id,nome,cor)').eq('id', id).single();
  if (!av) return <Vazio titulo="Prova não encontrada" />;
  const [{ data: rel }, { data: turmas }, { data: materias }, { data: conteudos }, { data: materiais }] = await Promise.all([
    sb.from('avaliacao_conteudos').select('conteudos(id,titulo,status)').eq('avaliacao_id', id),
    sb.from('turmas').select('id,nome,cor').order('ano'),
    sb.from('materias').select('id,nome,cor').order('nome'),
    sb.from('conteudos').select('id,titulo,status,turma_id,materia_id'),
    sb.from('materiais').select('id,titulo').eq('avaliacao_id', id).order('created_at'),
  ]);
  const escolhidos = (rel || []).map(r => r.conteudos).filter(Boolean);
  const prontos = escolhidos.filter(c => c.status === 'pronto');
  const ch = av.checagens || {};
  const historico = av.status === 'historico';
  return (
    <>
      <Voltar href="/avaliacoes">Provas</Voltar>
      <p className="eyebrow">Avaliação · {av.turmas?.nome}</p>
      <h1>{av.nome} de <span className="hl verde">{av.materias?.nome}</span></h1>
      <p className="dek">{av.data ? `Prova no dia ${dataBR(av.data)}.` : 'Sem data marcada.'}</p>

      {materiais?.length > 0 && (
        <div className="cartao fita" style={{ '--fita': 'var(--lilas)' }}>
          <h3 style={{ marginTop: 4 }}>Arquivos guardados</h3>
          <ul className="lista">{materiais.map(m => <li key={m.id}><a className="item-link" href={`/api/materiais/${m.id}`}><Icone n="baixar" style={{ width: 22 }} /><span>{m.titulo}</span></a></li>)}</ul>
        </div>
      )}
      {historico && av.historico_resumo && <details className="dobra"><summary>O que caiu nesta prova</summary><p style={{ whiteSpace: 'pre-line' }}>{av.historico_resumo}</p></details>}

      {!historico && (
        <ol className="passos">
          <li className={`passo ${prontos.length ? 'feito' : ''}`}>
            <h2>O que cai na prova</h2>
            {escolhidos.length ? (
              <ul className="lista">{escolhidos.map(c => <li key={c.id}><Link className="item-link" href={`/conteudos/${c.id}`}><span>{c.titulo}</span>{c.status !== 'pronto' && <span className="etq" style={{ '--c': 'var(--pessego)' }}>resumo não terminado</span>}</Link></li>)}</ul>
            ) : <p className="aviso">Nenhum conteúdo escolhido ainda.</p>}
            {av.pedidos && <p className="pequeno"><b>Seus pedidos:</b> {av.pedidos}</p>}
            <details className="dobra"><summary>Mudar conteúdo, nome, data ou pedidos</summary>
              <form action={salvarAvaliacao}>
                <input type="hidden" name="id" value={av.id} />
                <EscolhaConteudos turmas={turmas} materias={materias} conteudos={conteudos} turmaInicial={av.turma_id} materiaInicial={av.materia_id} marcados={escolhidos.map(c => c.id)} />
                <label className="campo"><span>Nome</span><input name="nome" defaultValue={av.nome} /></label>
                <label className="campo"><span>Data</span><input name="data" type="date" defaultValue={av.data || ''} /></label>
                <label className="campo"><span>Pedidos</span><textarea name="pedidos" defaultValue={av.pedidos || ''} /></label>
                <button className="botao pequeno">Salvar</button>
              </form>
            </details>
          </li>

          <li className={`passo ${av.prova ? 'feito' : ''} ${!prontos.length ? 'bloq' : ''}`}>
            <h2>Prova e gabarito</h2>
            <Gerador id={av.id} tipo="prova" existe={!!av.prova} bloqueado={!prontos.length} checagem={ch.prova} processandoInicial={av.processando === 'prova'} />
            {av.prova && (
              <>
                <div className="botoes">
                  <a className="botao" href={`/api/avaliacoes/${av.id}/baixar?arquivo=prova`}><Icone n="baixar" style={{ width: 20 }} />Baixar a prova (.doc)</a>
                  <a className="botao claro" href={`/api/avaliacoes/${av.id}/baixar?arquivo=gabarito`}><Icone n="baixar" style={{ width: 20 }} />Baixar o gabarito</a>
                </div>
                <details className="dobra"><summary>Ver a prova aqui</summary><PreviaProva prova={av.prova} /><p><Link href={`/avaliacoes/${av.id}/imprimir?doc=prova`}>Abrir para imprimir ou salvar em PDF</Link></p></details>
                <details className="dobra"><summary>Ver o gabarito aqui</summary><PreviaGabarito prova={av.prova} /></details>
              </>
            )}
          </li>

          <li className={`passo ${av.revisoes ? 'feito' : ''} ${!av.prova ? 'bloq' : ''}`}>
            <h2>Revisões</h2>
            <p className="suave pequeno" style={{ marginTop: -6 }}>8 fichas numa folha, “Responda em seu caderno”.</p>
            {ch.revisoes_desatualizadas && av.revisoes && <p className="aviso">A prova mudou depois que as revisões foram feitas. Refaça as revisões para garantir que nada da prova nova aparece nelas.</p>}
            <Gerador id={av.id} tipo="revisoes" existe={!!av.revisoes} bloqueado={!av.prova} checagem={ch.revisoes} processandoInicial={av.processando === 'revisoes'} />
            {av.revisoes && (
              <>
                <div className="botoes">
                  <a className="botao" href={`/api/avaliacoes/${av.id}/baixar?arquivo=revisoes`}><Icone n="baixar" style={{ width: 20 }} />Baixar as revisões (.doc)</a>
                  <a className="botao claro" href={`/api/avaliacoes/${av.id}/baixar?arquivo=gabarito-revisoes`}><Icone n="baixar" style={{ width: 20 }} />Baixar o gabarito</a>
                </div>
                <details className="dobra"><summary>Ver as fichas aqui</summary><PreviaFichas rev={av.revisoes} comRespostas /></details>
              </>
            )}
          </li>
        </ol>
      )}

      <details className="dobra" style={{ marginTop: 20 }}>
        <summary>Apagar esta prova</summary>
        <form action={apagarAvaliacao}><input type="hidden" name="id" value={av.id} /><button className="botao claro pequeno" style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Apagar prova, gabarito e revisões</button></form>
      </details>
    </>
  );
}
