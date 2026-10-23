import { contexto, cor, CORES } from '@/lib/dados';
import { SemAcesso } from '@/components/UI';
import { salvarPreferencias, criarMateria, trocarSenha } from '@/app/acoes';
import Icone from '@/components/Icone';
import GuardarArquivo from './GuardarArquivo';

export const dynamic = 'force-dynamic';

export default async function Mais({ searchParams }) {
  const sp = await searchParams;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const [{ data: cfg }, { data: materias }, { data: materiais }, { data: turmas }, { data: importados }] = await Promise.all([
    sb.from('configuracoes').select('regras_extras').eq('id', 1).single(),
    sb.from('materias').select('id,nome,cor').order('nome'),
    sb.from('materiais').select('id,titulo,turmas(nome),materias(nome,cor)').order('created_at', { ascending: false }),
    sb.from('turmas').select('id,nome,cor').order('ano'),
    sb.from('conteudos').select('id').contains('info', { importado: true }).limit(1),
  ]);
  return (
    <>
      <h1><span className="hl amarelo">Mais</span> coisas</h1>

      {sp.importado && <p className={`aviso ${sp.importado.startsWith('erro') ? 'erro' : 'ok'}`}>{sp.importado === 'ok' ? 'Pronto! As apostilas, provas e revisões que já tinham sido feitas estão no Caderno.' : sp.importado}</p>}
      {!importados?.length && (
        <form action="/api/importar" method="post" className="cartao fita" style={{ '--fita': 'var(--pessego)' }}>
          <h3 style={{ marginTop: 4 }}>Trazer o que já foi feito</h3>
          <p className="pequeno">Coloca no Caderno os 3 resumos de apostila e as provas A8 (Geografia 4º e 5º ano, História 4º ano), com gabaritos e revisões. Só precisa fazer uma vez.</p>
          <button className="botao pequeno">Trazer agora</button>
        </form>
      )}

      <h2>Como funciona</h2>
      <ol className="pequeno" style={{ paddingLeft: 20 }}>
        <li><b>Mandar apostila:</b> escolha turma e matéria e mande as fotos ou prints das páginas. O sistema lê tudo, monta um resumo fiel e aponta os erros da apostila.</li>
        <li><b>Nova prova:</b> escolha o conteúdo que cai. O sistema monta a prova no modelo do Pirralho, com tom lúdico, gabarito separado e conferência automática.</li>
        <li><b>Revisões:</b> 8 fichas numa folha, “Responda em seu caderno”, sem nada igual à prova.</li>
        <li>Os arquivos saem em <b>.doc</b>, que abre no Word antigo.</li>
      </ol>

      <h2>Preferências fixas</h2>
      <p className="suave pequeno">O que você escrever aqui vale para todas as provas e revisões. O sistema já sabe o modelo do Pirralho: escreva só o que quiser mudar ou reforçar.</p>
      <form action={salvarPreferencias}>
        <label className="campo"><span className="sr">Preferências</span><textarea name="regras_extras" defaultValue={cfg?.regras_extras || ''} placeholder="Ex.: Sempre colocar uma questão de cruzadinha. Evitar questões de verdadeiro ou falso." /></label>
        <button className="botao pequeno">Salvar preferências</button>
      </form>

      <h2>Matérias</h2>
      <p>{materias.map(m => <span key={m.id} className="etq" style={{ '--c': cor(m.cor), marginRight: 6 }}>{m.nome}</span>)}</p>
      <details className="dobra"><summary>Adicionar matéria</summary>
        <form action={criarMateria}>
          <label className="campo"><span>Nome</span><input name="nome" placeholder="Ex.: Ciências" required /></label>
          <div className="campo"><span>Cor</span><div className="escolhas">{CORES.map((c, i) => <label key={c} className="escolha" style={{ '--c': `var(--${c})` }}><input type="radio" name="cor" value={c} defaultChecked={!i} /><span>{c}</span></label>)}</div></div>
          <button className="botao pequeno">Salvar matéria</button>
        </form>
      </details>

      <h2>Arquivos guardados</h2>
      {materiais?.length > 0 && <ul className="lista">{materiais.map(m => <li key={m.id}><a className="item-link" style={{ minHeight: 52, padding: '10px 2px' }} href={`/api/materiais/${m.id}`}><Icone n="baixar" style={{ width: 22, flex: 'none' }} /><div><div>{m.titulo}</div><div className="sub">{[m.turmas?.nome, m.materias?.nome].filter(Boolean).join(' · ')}</div></div></a></li>)}</ul>}
      <details className="dobra"><summary>Guardar um arquivo</summary><GuardarArquivo turmas={turmas || []} materias={materias || []} /></details>

      <h2>Minha conta</h2>
      <p className="suave pequeno">Entrou como {user.email}</p>
      {sp.senha === 'ok' && <p className="aviso ok">Senha trocada!</p>}
      {sp.senha === 'curta' && <p className="aviso erro">A senha precisa ter pelo menos 6 letras ou números.</p>}
      {sp.senha === 'erro' && <p className="aviso erro">Não deu para trocar a senha. Tente outra.</p>}
      <details className="dobra"><summary>Trocar senha</summary>
        <form action={trocarSenha}><label className="campo"><span>Nova senha</span><input type="password" name="senha" autoComplete="new-password" minLength={6} required /></label><button className="botao pequeno">Trocar</button></form>
      </details>
      <form action="/api/sair" method="post" style={{ marginTop: 20 }}><button className="botao claro">Sair</button></form>
    </>
  );
}
