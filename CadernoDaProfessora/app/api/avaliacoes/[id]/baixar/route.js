import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provaRTF, gabaritoRTF, fichasRTF, gabaritoFichasRTF } from '@/lib/rtf';
import { nomeArquivo } from '@/lib/avaliacao';

export async function GET(req, { params }) {
  const { id } = await params;
  const tipo = new URL(req.url).searchParams.get('arquivo') || 'prova';
  const sb = await createClient();
  const { data: av } = await sb.from('avaliacoes').select('*,turmas(nome),materias(nome)').eq('id', id).single();
  if (!av) return NextResponse.json({ erro: 'Avaliação não encontrada.' }, { status: 404 });
  const meta = { materia: av.materias?.nome, turma: av.turmas?.nome };
  let rtf;
  if (tipo === 'prova' && av.prova) rtf = provaRTF(av.prova);
  else if (tipo === 'gabarito' && av.prova) rtf = gabaritoRTF(av.prova);
  else if (tipo === 'revisoes' && av.revisoes) rtf = fichasRTF(av.revisoes, meta);
  else if (tipo === 'gabarito-revisoes' && av.revisoes) rtf = gabaritoFichasRTF(av.revisoes, meta);
  else return NextResponse.json({ erro: 'Esse arquivo ainda não foi criado.' }, { status: 404 });
  const nome = nomeArquivo(av, tipo);
  return new NextResponse(rtf, {
    headers: {
      'content-type': 'application/msword',
      'content-disposition': `attachment; filename="${nome}"`,
      'cache-control': 'no-store',
    },
  });
}
