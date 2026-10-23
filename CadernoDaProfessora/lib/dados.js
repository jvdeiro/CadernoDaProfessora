import { createClient } from '@/lib/supabase/server';

export const CORES = ['verde', 'pessego', 'lilas', 'amarelo', 'azul', 'rosa'];
export const cor = c => `var(--${CORES.includes(c) ? c : 'amarelo'})`;

export function dataBR(d) {
  if (!d) return '';
  const [a, m, dia] = String(d).slice(0, 10).split('-');
  return `${dia}/${m}/${a}`;
}
export function dataLonga(d) {
  if (!d) return '';
  const dt = new Date(String(d).slice(0, 10) + 'T12:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export async function contexto() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: membro } = await sb.from('membros').select('*').eq('email', (user?.email || '').toLowerCase()).maybeSingle();
  return { sb, user, membro };
}
