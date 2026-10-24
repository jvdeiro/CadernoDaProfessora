import Link from 'next/link';
import { contexto, cor } from '@/lib/dados';
import { SemAcesso, Voltar } from '@/components/UI';
import { criarAvaliacao } from '@/app/acoes';
import EscolhaConteudos from './EscolhaConteudos';

export const dynamic = 'force-dynamic';

export default async function Nova({ searchParams }) {
  const sp = await searchParams;
  const { sb, user, membro } = await contexto();
  if (!membro) return <SemAcesso email={user?.email} />;
  const [{ data: turmas }, { data: materias }, { data: conteudos }] = await Promise.all([
    sb.from('turmas').select('id,nome,cor').order('ano'),
    sb.from('materias').select('id,nome,cor').order('nome'),
    sb.from('conteudos').select('id,titulo,status,turma_id,materia_id').order('created_at', { ascending: false }),
  ]);
  return (
    <>
      <Voltar href="/avaliacoes" />
      <h1>Nova <span className="hl verde">prova</span></h1>
      <p className="dek">Escolha a turma, a matéria e o conteúdo que cai. O sistema monta a prova no modelo do Pirralho, o gabarito e as revisões.</p>
      <form action={criarAvaliacao}>
        <EscolhaConteudos turmas={turmas} materias={materias} conteudos={conteudos} turmaInicial={sp.turma} />
        <label className="campo"><span>Nome da avaliação</span><input name="nome" placeholder="Ex.: A8" required /></label>
        <label className="campo"><span>Data da prova (opcional)</span><input name="data" type="date" /></label>
        <label className="campo"><span>Algum pedido para esta prova? (opcional)</span>
          <textarea name="pedidos" placeholder="Ex.: Quero questões de pinte a alternativa, complete com o quadro e defina. Pode ser mais lúdica." />
          <small>Não precisa explicar o modelo da prova: o sistema já sabe.</small>
        </label>
        <button className="botao cheio">Criar e continuar</button>
      </form>
      <p className="suave pequeno" style={{ marginTop: 16 }}>O conteúdo ainda não está aqui? <Link href="/conteudos/novo">Mande as fotos da apostila primeiro</Link>.</p>
    </>
  );
}
