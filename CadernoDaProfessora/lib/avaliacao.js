// Monta o contexto que a IA recebe para criar prova e revisões de uma avaliação.
import { semAcento } from './texto.js';

export async function carregarAvaliacao(sb, id) {
  const { data: av } = await sb.from('avaliacoes').select('*,turmas(id,nome,ano,idade),materias(id,nome)').eq('id', id).single();
  if (!av) return null;
  const { data: rel } = await sb.from('avaliacao_conteudos').select('conteudos(id,titulo,resumo_md,anexo_erros_md,status)').eq('avaliacao_id', id);
  const conteudos = (rel || []).map(r => r.conteudos).filter(Boolean);
  const { data: cfg } = await sb.from('configuracoes').select('regras_extras').eq('id', 1).single();
  const { data: outras } = await sb.from('avaliacoes').select('nome,historico_resumo,prova,revisoes').eq('turma_id', av.turma_id).eq('materia_id', av.materia_id).neq('id', id);
  const historico = (outras || []).map(o => {
    let t = `- ${o.nome}:`;
    if (o.historico_resumo) t += `\n${o.historico_resumo}`;
    if (o.prova?.resumo_questoes) t += '\n' + o.prova.resumo_questoes.map(x => `  · ${x}`).join('\n');
    if (o.revisoes?.fichas) t += '\n  Revisões: ' + o.revisoes.fichas.flatMap(f => f.perguntas.map(p => p.texto)).join(' | ');
    return t;
  }).join('\n');
  const ctx = {
    turma: av.turmas?.nome, idade: av.turmas?.idade, materia: av.materias?.nome, nome: av.nome,
    data: av.data ? av.data.split('-').reverse().join('/') : '', conteudos, historico, pedidos: av.pedidos, regrasExtras: cfg?.regras_extras,
  };
  return { av, ctx, conteudos };
}

export function nomeArquivo(av, tipo) {
  const limpa = s => semAcento(s).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const mat = limpa(av.materias?.nome || '');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const base = `${limpa(av.nome)}_${cap(mat)}_${limpa(av.turmas?.nome || '').replace('_ano', 'ano')}`;
  return {
    prova: `${base}.doc`,
    gabarito: `Gabarito_${base}.doc`,
    revisoes: `Revisoes_${cap(mat)}_${limpa(av.turmas?.nome || '').replace('_ano', 'ano')}.doc`,
    'gabarito-revisoes': `Gabarito_Revisoes_${cap(mat)}_${limpa(av.turmas?.nome || '').replace('_ano', 'ano')}.doc`,
  }[tipo];
}
