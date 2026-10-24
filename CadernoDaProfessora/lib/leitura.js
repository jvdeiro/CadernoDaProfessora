// Leitura de uma foto e organização do resumo — usadas pelo robô (/api/fila) e pelas rotas manuais.
import { transcreverPagina, revisarMaterial, definirPrazo } from './ia.js';
import { semAcento } from './texto.js';
import { blocosResumo, partesResumo, paginasFaltando } from './resumo.js';

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

// Organiza o resumo em PARTES: a IA confere uma parte por vez e cada parte pronta fica salva no banco.
// Se o tempo acabar ou faltar IA, a próxima rodada continua da parte em que parou (nada se perde).
// No fim, as partes são juntadas por código. Devolve { pronto } ou { pendente, feitas, total }.
export async function organizarConteudo(sb, id, { prazo = Date.now() + 150000 } = {}) {
  const { data: c } = await sb.from('conteudos').select('*,turmas(nome),materias(nome)').eq('id', id).single();
  if (!c) throw new Error('Conteúdo não encontrado.');
  const { data: pags } = await sb.from('paginas').select('ordem,status,erro,transcricao').eq('conteudo_id', id).order('ordem');
  const lidas = (pags || []).filter(p => p.status === 'lida');
  const fora = (pags || []).filter(p => p.status === 'fora');
  if (!lidas.length) throw new Error('Nenhuma página lida ainda.');
  const blocos = blocosResumo(lidas);
  const resumo = blocos.map(b => b.md).join('\n\n');
  const partes = partesResumo(blocos);
  const assinatura = `${blocos.length}:${resumo.length}`;
  const info = c.info || {};
  let org = info.organizacao?.assinatura === assinatura ? info.organizacao : { assinatura, feitas: [] };
  const salvar = async extra => {
    const feitas = partes.filter((_, i) => org.feitas[i]).length;
    await sb.from('conteudos').update({ resumo_md: resumo, info: { ...info, organizacao: org, organizacao_progresso: { feitas, total: partes.length } }, ...extra }).eq('id', id);
    return feitas;
  };
  await salvar();

  definirPrazo(prazo); // nenhuma chamada de IA passa do prazo desta rodada
  try {
    for (let i = 0; i < partes.length; i++) {
      if (org.feitas[i]) continue;
      if (Date.now() > prazo - 15000) return { pendente: true, feitas: await salvar(), total: partes.length };
      let r;
      try {
        r = await revisarMaterial({ resumo: partes[i].texto, turma: c.turmas?.nome, materia: c.materias?.nome, descricao: c.descricao, parte: { n: i + 1, total: partes.length, paginas: partes[i].paginas } });
      } catch (e) {
        // Sem tempo nesta rodada não é falha: o que já ficou pronto está salvo e a próxima rodada segue daqui.
        if (e.semTempo) return { pendente: true, feitas: await salvar(), total: partes.length };
        throw e;
      }
      org = { ...org, feitas: Object.assign([], org.feitas, { [i]: r }) };
      await salvar(); // parte guardada: se cair agora, recomeça da próxima
    }
  } finally { definirPrazo(0); }

  // Junta as partes (sem IA)
  const rs = partes.map((_, i) => org.feitas[i]);
  const topicos = [];
  for (const t of rs.flatMap(r => r.topicos || [])) {
    const ult = topicos[topicos.length - 1];
    if (ult && ult.titulo?.trim().toLowerCase() === t.titulo?.trim().toLowerCase()) ult.paginas = [ult.paginas, t.paginas].filter(Boolean).join(', ');
    else topicos.push({ ...t });
  }
  const juntar = campo => rs.map(r => (r[campo] || '').trim()).filter(x => x && !/^(nenhum|nada|não há|sem)\b/i.test(x)).join('\n\n');
  const paginas_fora = [
    ...fora.map(p => ({ pagina: p.transcricao?.paginas?.map(x => x.numero).filter(Boolean).join(', ') || '?', motivo: p.erro || 'outro assunto' })),
    ...rs.flatMap(r => r.paginas_fora || []),
  ];
  const { organizacao, organizacao_progresso, ...resto } = info;
  await sb.from('conteudos').update({
    resumo_md: resumo, anexo_erros_md: juntar('anexo_erros_md'), status: 'pronto', updated_at: new Date().toISOString(),
    info: { ...resto, topicos, paginas_faltando: paginasFaltando(blocos), paginas_fora, destaques_md: juntar('destaques_md') },
  }).eq('id', id);
  return { pronto: true, total: partes.length };
}
