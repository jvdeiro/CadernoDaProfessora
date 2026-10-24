import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcreverPagina } from '@/lib/ia';
import { semAcento } from '@/lib/texto';

export const maxDuration = 300;

export async function POST(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: p } = await sb.from('paginas').select('*,conteudos(descricao,turmas(nome,ano),materias(nome))').eq('id', id).single();
  if (!p) return NextResponse.json({ erro: 'Página não encontrada.' }, { status: 404 });
  await sb.from('paginas').update({ status: 'lendo', lendo_em: new Date().toISOString() }).eq('id', id);
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
    return NextResponse.json({ ok: true, status, numero });
  } catch (e) {
    if (e.temporario) { // nenhuma IA livre agora: a foto volta para a fila e a tela tenta de novo sozinha
      await sb.from('paginas').update({ status: 'enviada', erro: 'Esperando uma IA livre' }).eq('id', id);
      return NextResponse.json({ erro: e.message, esperar: true }, { status: 503 });
    }
    await sb.from('paginas').update({ status: 'erro', erro: e.message }).eq('id', id);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
