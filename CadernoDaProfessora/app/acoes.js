'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const v = (f, k) => (f.get(k) ?? '').toString().trim();

export async function criarTurma(f) {
  const sb = await createClient();
  const ano = parseInt(v(f, 'ano')) || null;
  await sb.from('turmas').insert({ nome: v(f, 'nome') || `${ano}º ano`, ano, idade: parseInt(v(f, 'idade')) || (ano ? ano + 5 : null), cor: v(f, 'cor') || 'verde' });
  revalidatePath('/turmas');
}
export async function criarMateria(f) {
  const sb = await createClient();
  const nome = v(f, 'nome');
  if (nome) await sb.from('materias').insert({ nome, cor: v(f, 'cor') || 'amarelo' });
  revalidatePath('/mais');
}

export async function criarConteudo(f) {
  const sb = await createClient();
  const { data, error } = await sb.from('conteudos').insert({
    turma_id: v(f, 'turma_id'), materia_id: v(f, 'materia_id'), titulo: v(f, 'titulo') || 'Conteúdo da apostila', descricao: v(f, 'descricao'),
  }).select('id').single();
  if (error) throw new Error(error.message);
  redirect(`/conteudos/${data.id}`);
}
export async function salvarConteudo(f) {
  const sb = await createClient();
  const id = v(f, 'id');
  await sb.from('conteudos').update({ titulo: v(f, 'titulo'), descricao: v(f, 'descricao'), updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(`/conteudos/${id}`);
}
export async function apagarConteudo(f) {
  const sb = await createClient();
  const id = v(f, 'id');
  const { data: c } = await sb.from('conteudos').select('turma_id').eq('id', id).single();
  const { data: pags } = await sb.from('paginas').select('storage_path').eq('conteudo_id', id);
  if (pags?.length) await sb.storage.from('paginas').remove(pags.map(p => p.storage_path));
  await sb.from('conteudos').delete().eq('id', id);
  redirect(c ? `/turmas/${c.turma_id}` : '/turmas');
}

export async function criarAvaliacao(f) {
  const sb = await createClient();
  const { data, error } = await sb.from('avaliacoes').insert({
    turma_id: v(f, 'turma_id'), materia_id: v(f, 'materia_id'), nome: v(f, 'nome') || 'Avaliação', data: v(f, 'data') || null, pedidos: v(f, 'pedidos'),
  }).select('id').single();
  if (error) throw new Error(error.message);
  const conteudos = f.getAll('conteudos').map(String).filter(Boolean);
  if (conteudos.length) await sb.from('avaliacao_conteudos').insert(conteudos.map(c => ({ avaliacao_id: data.id, conteudo_id: c })));
  redirect(`/avaliacoes/${data.id}`);
}
export async function salvarAvaliacao(f) {
  const sb = await createClient();
  const id = v(f, 'id');
  await sb.from('avaliacoes').update({ nome: v(f, 'nome'), data: v(f, 'data') || null, pedidos: v(f, 'pedidos'), updated_at: new Date().toISOString() }).eq('id', id);
  const conteudos = f.getAll('conteudos').map(String).filter(Boolean);
  await sb.from('avaliacao_conteudos').delete().eq('avaliacao_id', id);
  if (conteudos.length) await sb.from('avaliacao_conteudos').insert(conteudos.map(c => ({ avaliacao_id: id, conteudo_id: c })));
  redirect(`/avaliacoes/${id}`);
}
export async function apagarAvaliacao(f) {
  const sb = await createClient();
  await sb.from('avaliacoes').delete().eq('id', v(f, 'id'));
  redirect('/avaliacoes');
}

export async function salvarAula(f) {
  const sb = await createClient();
  const id = v(f, 'id');
  const dados = { turma_id: v(f, 'turma_id') || null, materia_id: v(f, 'materia_id') || null, data: v(f, 'data') || null, tema: v(f, 'tema'), anotacoes: v(f, 'anotacoes') };
  if (id) await sb.from('aulas').update(dados).eq('id', id);
  else await sb.from('aulas').insert(dados);
  redirect('/aulas');
}
export async function marcarAula(f) {
  const sb = await createClient();
  await sb.from('aulas').update({ feita: v(f, 'feita') === '1' }).eq('id', v(f, 'id'));
  revalidatePath('/aulas');
}
export async function apagarAula(f) {
  const sb = await createClient();
  await sb.from('aulas').delete().eq('id', v(f, 'id'));
  redirect('/aulas');
}

export async function salvarPreferencias(f) {
  const sb = await createClient();
  await sb.from('configuracoes').update({ regras_extras: v(f, 'regras_extras'), updated_at: new Date().toISOString() }).eq('id', 1);
  revalidatePath('/mais');
}
export async function trocarSenha(f) {
  const sb = await createClient();
  const s = v(f, 'senha');
  if (s.length < 6) redirect('/mais?senha=curta');
  const { error } = await sb.auth.updateUser({ password: s });
  redirect(error ? '/mais?senha=erro' : '/mais?senha=ok');
}
export async function sair() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect('/login');
}

// Boas-vindas: a pessoa terminou (ou pulou) o passeio de primeiro acesso. Vale só para a própria conta.
export async function concluirBoasVindas() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return;
  await sb.from('membros').update({ boas_vindas_pendente: false, boas_vindas_vista_em: new Date().toISOString() }).eq('email', user.email.toLowerCase());
  revalidatePath('/'); revalidatePath('/mais');
}
