import { contexto, cor } from '@/lib/dados';
import { SemAcesso, Voltar, Vazio } from '@/components/UI';
import { mdParaHtml } from '@/lib/markdown';
import { salvarConteudo, apagarConteudo } from '@/app/acoes';
import Paginas from './Paginas';

export const dynamic = 'force-dynamic';

export default async function Conteudo({ params }) {
  const { id } = await params;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const { data: c } = await sb.from('conteudos').select('*,turmas(id,nome,cor),materias(nome,cor)').eq('id', id).single();
  if (!c) return <Vazio titulo="Conteúdo não encontrado" />;
  const { data: pags } = await sb.from('paginas').select('id,storage_path,ordem,status,erro,transcricao,lendo_em').eq('conteudo_id', id).order('ordem');
  const paths = (pags || []).map(p => p.storage_path);
  const { data: urls } = paths.length ? await sb.storage.from('paginas').createSignedUrls(paths, 3600) : { data: [] };
  const lista = (pags || []).map((p, i) => ({
    id: p.id, status: p.status, erro: p.erro, lendoEm: p.lendo_em, url: urls?.[i]?.signedUrl,
    numero: p.transcricao?.paginas?.map(x => x.numero).filter(Boolean).join(', ') || null, origem: p.transcricao?.origem || null,
  }));
  const info = c.info || {};
  return (
    <>
      <Voltar href={`/turmas/${c.turmas?.id}`}>{c.turmas?.nome}</Voltar>
      <p className="eyebrow">Apostila · {c.materias?.nome} · {c.turmas?.nome}</p>
      <h1>{c.titulo}</h1>
      {c.descricao && <p className="dek">{c.descricao}</p>}

      <Paginas conteudoId={c.id} iniciais={lista} pronto={c.status === 'pronto'} processandoInicial={!!c.processando} />

      {c.resumo_md && (
        <>
          <h2 className="faixa" style={{ '--hl': 'var(--verde)' }}>Resumo fiel à apostila</h2>
          {(info.paginas_fora?.length > 0 || info.paginas_faltando?.length > 0) && (
            <div className="aviso">
              {info.paginas_fora?.length > 0 && <p style={{ margin: 0 }}><b>Ficaram de fora</b> (outra matéria ou outro ano): {info.paginas_fora.map(p => `p. ${p.pagina}`).join(', ')}.</p>}
              {info.paginas_faltando?.length > 0 && <p style={{ margin: '6px 0 0' }}><b>Páginas que não vieram:</b> {info.paginas_faltando.join(', ')}. Se forem importantes para a prova, mande as fotos.</p>}
            </div>
          )}
          {info.topicos?.length > 0 && (
            <ul className="lista">{info.topicos.map((t, i) => <li key={i}><span className="mao" style={{ fontSize: '1.25rem' }}>{t.titulo}</span> <span className="suave pequeno">{t.paginas}</span></li>)}</ul>
          )}
          <details className="dobra"><summary>Ler o resumo completo</summary><div className="resumo" dangerouslySetInnerHTML={{ __html: mdParaHtml(c.resumo_md) }} /></details>
          {c.anexo_erros_md && <details className="dobra"><summary>Pontos a conferir <span className="etq" style={{ '--c': 'var(--pessego)' }}>não caem na prova</span></summary><div className="resumo" dangerouslySetInnerHTML={{ __html: mdParaHtml(c.anexo_erros_md) }} /></details>}
          {info.destaques_md && <details className="dobra"><summary>O que estava marcado na apostila</summary><div className="resumo" dangerouslySetInnerHTML={{ __html: mdParaHtml(info.destaques_md) }} /></details>}
        </>
      )}

      <details className="dobra" style={{ marginTop: 24 }}>
        <summary>Editar nome ou apagar</summary>
        <form action={salvarConteudo}>
          <input type="hidden" name="id" value={c.id} />
          <label className="campo"><span>Nome</span><input name="titulo" defaultValue={c.titulo} /></label>
          <label className="campo"><span>Recado sobre as páginas</span><textarea name="descricao" defaultValue={c.descricao || ''} /></label>
          <button className="botao pequeno">Salvar</button>
        </form>
        <form action={apagarConteudo} style={{ marginTop: 18 }}>
          <input type="hidden" name="id" value={c.id} />
          <button className="botao claro pequeno" style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Apagar este conteúdo e as fotos</button>
        </form>
      </details>
    </>
  );
}
