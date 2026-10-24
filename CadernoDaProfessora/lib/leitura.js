// Leitura de uma foto e organização do resumo — usadas pelo robô (/api/fila) e pelas rotas manuais.
import { transcreverPagina, revisarMaterial } from './ia.js';
import { semAcento } from './texto.js';
import { montarResumo } from './resumo.js';

// Lê uma foto já marcada como "lendo". Devolve { status, numero }.
// Se nenhuma IA estiver livre, a foto volta para a fila ("enviada") e o erro sai com .temporario.
export async function lerPagina(sb, id) {
  const { data: p } = await sb.from('paginas').select('*,conteudos(descricao,turmas(nome,ano),materias(nome))').eq('id', id).single();
  if (!p) throw new Error('Página não encontrada.');
  try {
    const { data: blob, error } = await sb.storage.from('paginas').download(p.storage_path);
    if (error) throw new Error('Não consegui abrir a foto.');
    const b64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    const c = p.conteudos;
    const t = await transcreverPagina({ imagemBase64: b64, mediaType: 'image/jpeg', turma: c.turmas?.nome, materia: c.materias?.nome, dica: c.descricao });
    // Página de outra matéria ou outro ano fica de fora
    let status = 'lida', erro = null;
    const mat = semAcento(t.materia_detectada || ''), matC = semAcento(c.materias?.nome || '');
    const anoDet = parseInt(String(t.ano_detectado || '').match(/\d+/)?.[0] || '');
    if (mat && matC && !mat.includes(matC.slice(0, 5)) && !matC.includes(mat.slice(0, 5))) { status = 'fora'; erro = `Parece ser de ${t.materia_detectada}.`; }
    else if (anoDet && c.turmas?.ano && anoDet !== c.turmas.ano) { status = 'fora'; erro = `Parece ser do ${anoDet}º ano.`; }
    const numero = t.paginas?.map(x => x.numero).filter(Boolean).join(', ') || null;
    await sb.from('paginas').update({ transcricao: t, status, erro }).eq('id', id);
    return { status, numero };
  } catch (e) {
    if (e.temporario) await sb.from('paginas').update({ status: 'enviada', erro: 'Esperando uma IA livre' }).eq('id', id);
    else await sb.from('paginas').update({ status: 'erro', erro: e.message }).eq('id', id);
    throw e;
  }
}

// Junta as páginas lidas num resumo fiel e pede à IA os tópicos e os "pontos a conferir".
export async function organizarConteudo(sb, id) {
  const { data: c } = await sb.from('conteudos').select('*,turmas(nome),materias(nome)').eq('id', id).single();
  if (!c) throw new Error('Conteúdo não encontrado.');
  const { data: pags } = await sb.from('paginas').select('ordem,status,erro,transcricao').eq('conteudo_id', id).order('ordem');
  const lidas = (pags || []).filter(p => p.status === 'lida');
  const fora = (pags || []).filter(p => p.status === 'fora');
  if (!lidas.length) throw new Error('Nenhuma página lida ainda.');
  const resumo = montarResumo(lidas);
  try {
    const r = await revisarMaterial({ resumo, turma: c.turmas?.nome, materia: c.materias?.nome, descricao: c.descricao });
    const paginas_fora = [
      ...fora.map(p => ({ pagina: p.transcricao?.paginas?.map(x => x.numero).filter(Boolean).join(', ') || '?', motivo: p.erro || 'outro assunto' })),
      ...(r.paginas_fora || []),
    ];
    await sb.from('conteudos').update({
      resumo_md: resumo, anexo_erros_md: r.anexo_erros_md, status: 'pronto', updated_at: new Date().toISOString(),
      info: { topicos: r.topicos || [], paginas_faltando: r.paginas_faltando || [], paginas_fora, destaques_md: r.destaques_md || '' },
    }).eq('id', id);
    return c;
  } catch (e) {
    await sb.from('conteudos').update({ resumo_md: resumo }).eq('id', id);
    throw e;
  }
}
