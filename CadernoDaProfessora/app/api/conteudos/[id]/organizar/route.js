import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revisarMaterial } from '@/lib/ia';
import { montarResumo } from '@/lib/resumo';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: c } = await sb.from('conteudos').select('*,turmas(nome),materias(nome)').eq('id', id).single();
  if (!c) return NextResponse.json({ erro: 'Conteúdo não encontrado.' }, { status: 404 });
  const { data: pags } = await sb.from('paginas').select('ordem,status,erro,transcricao').eq('conteudo_id', id).order('ordem');
  const lidas = (pags || []).filter(p => p.status === 'lida');
  const fora = (pags || []).filter(p => p.status === 'fora');
  if (!lidas.length) return NextResponse.json({ erro: 'Nenhuma página lida ainda.' }, { status: 400 });
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    await sb.from('conteudos').update({ resumo_md: resumo, updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
