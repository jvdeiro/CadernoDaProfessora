import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(req, { params }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: m } = await sb.from('materiais').select('*').eq('id', id).single();
  if (!m) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
  const { data } = await sb.storage.from('materiais').createSignedUrl(m.storage_path, 300, { download: m.storage_path.split('/').pop() });
  return NextResponse.redirect(data.signedUrl);
}
