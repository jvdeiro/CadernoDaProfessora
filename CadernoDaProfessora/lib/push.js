// Notificações push (padrão Web Push, sem biblioteca): o aviso fica salvo na tabela "avisos"
// e o celular recebe só um "toque" — o service worker busca o texto em /api/avisos/ultimo e mostra.
import crypto from 'crypto';

const b64u = b => Buffer.from(b).toString('base64url');

function tokenVapid(endpoint, chavePrivadaJwk) {
  const aud = new URL(endpoint).origin;
  const cab = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://cadernodaprofessora.vercel.app' }));
  const chave = crypto.createPrivateKey({ key: JSON.parse(chavePrivadaJwk), format: 'jwk' });
  const ass = crypto.sign('sha256', Buffer.from(`${cab}.${corpo}`), { key: chave, dsaEncoding: 'ieee-p1363' });
  return `${cab}.${corpo}.${b64u(ass)}`;
}

export async function avisar(sb, { titulo, corpo, url }, { vapidPrivada, vapidPublica }) {
  await sb.from('avisos').insert({ titulo, corpo, url });
  const { data: inscricoes } = await sb.from('push_inscricoes').select('endpoint');
  let enviados = 0;
  for (const { endpoint } of inscricoes || []) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { TTL: '86400', Urgency: 'high', 'Content-Length': '0', Authorization: `vapid t=${tokenVapid(endpoint, vapidPrivada)}, k=${vapidPublica}` },
      });
      if (r.status === 404 || r.status === 410) await sb.from('push_inscricoes').delete().eq('endpoint', endpoint); // celular desinscrito
      else if (r.ok) enviados++;
    } catch {}
  }
  return enviados;
}
