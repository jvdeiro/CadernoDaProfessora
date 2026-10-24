// Guarda a inscrição do celular para receber notificações.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const s = await req.json().catch(() => null);
  if (!s?.endpoint) return NextResponse.json({ erro: 'inscrição inválida' }, { status: 400 });
  const { error } = await sb.from('push_inscricoes').upsert({ endpoint: s.endpoint, email: user?.email || '', p256dh: s.keys?.p256dh, auth: s.keys?.auth });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
